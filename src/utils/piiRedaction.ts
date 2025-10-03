/**
 * PII Redaction Utilities
 * 
 * Client-side utilities to redact personally identifiable information
 * before logging or displaying in UI. Server-side redaction is also
 * applied via database triggers.
 */

/**
 * Redact email addresses from text
 */
export const redactEmail = (text: string): string => {
  return text.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL_REDACTED]'
  );
};

/**
 * Redact phone numbers from text (various formats)
 */
export const redactPhone = (text: string): string => {
  return text.replace(
    /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    '[PHONE_REDACTED]'
  );
};

/**
 * Redact BSN/NIS numbers (9 digits)
 */
export const redactBSN = (text: string): string => {
  return text.replace(/\b\d{9}\b/g, '[BSN_REDACTED]');
};

/**
 * Redact IP addresses (IPv4 and IPv6)
 */
export const redactIP = (text: string): string => {
  // IPv4
  let result = text.replace(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    '[IP_REDACTED]'
  );
  
  // IPv6
  result = result.replace(
    /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    '[IP_REDACTED]'
  );
  
  return result;
};

/**
 * Redact credit card numbers
 */
export const redactCreditCard = (text: string): string => {
  return text.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    '[CARD_REDACTED]'
  );
};

/**
 * Comprehensive PII redaction - applies all redaction rules
 */
export const redactPII = (text: string): string => {
  if (!text) return text;
  
  let result = text;
  result = redactEmail(result);
  result = redactPhone(result);
  result = redactBSN(result);
  result = redactIP(result);
  result = redactCreditCard(result);
  
  return result;
};

/**
 * Redact PII from objects (useful for logging)
 */
export const redactPIIFromObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactPII(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactPIIFromObject);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const sensitiveKeys = [
      'email',
      'phone',
      'bsn',
      'nis',
      'ssn',
      'password',
      'ip',
      'ip_address',
      'credit_card',
      'card_number',
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactPIIFromObject(value);
      }
    }
    
    return result;
  }
  
  return obj;
};

/**
 * Safe console.log that redacts PII
 * Use this instead of console.log for sensitive data
 */
export const safeLog = (...args: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    const redacted = args.map(redactPIIFromObject);
    console.log('[SAFE LOG]', ...redacted);
  }
};

/**
 * Safe console.error that redacts PII
 * Use this instead of console.error for sensitive data
 */
export const safeError = (...args: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    const redacted = args.map(redactPIIFromObject);
    console.error('[SAFE ERROR]', ...redacted);
  }
};
