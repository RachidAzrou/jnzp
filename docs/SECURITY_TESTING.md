# Security Testing Guide

This document provides a comprehensive guide for penetration testing and security assessment of JanazApp.

## Table of Contents
- [Testing Methodology](#testing-methodology)
- [Pre-Test Checklist](#pre-test-checklist)
- [Authentication Testing](#authentication-testing)
- [Authorization Testing](#authorization-testing)
- [Input Validation Testing](#input-validation-testing)
- [Session Management Testing](#session-management-testing)
- [Cryptography Testing](#cryptography-testing)
- [Business Logic Testing](#business-logic-testing)
- [API Security Testing](#api-security-testing)
- [Post-Test Activities](#post-test-activities)

## Testing Methodology

We follow the OWASP Testing Guide methodology with focus on:
1. **Information Gathering**
2. **Configuration Testing**
3. **Authentication Testing**
4. **Authorization Testing**
5. **Session Management Testing**
6. **Input Validation Testing**
7. **Error Handling Testing**
8. **Cryptography Testing**
9. **Business Logic Testing**
10. **Client-Side Testing**

### Testing Environment
- **Staging Environment**: Use for all penetration tests
- **Production**: Only passive reconnaissance allowed
- **Test Accounts**: Separate test accounts for each role

## Pre-Test Checklist

### Preparation
- [ ] Obtain written authorization for testing
- [ ] Define scope (in-scope URLs, IPs, features)
- [ ] Set up test accounts for all roles:
  - [ ] Family account
  - [ ] Funeral Director account
  - [ ] Mosque account
  - [ ] Wasplaats account
  - [ ] Insurer account
  - [ ] Org Admin account
  - [ ] Platform Admin account
- [ ] Backup database before testing
- [ ] Set up monitoring/alerting for unusual activity
- [ ] Document baseline behavior

### Tools Required
- **Burp Suite Professional** (or Community Edition)
- **OWASP ZAP**
- **Postman** (for API testing)
- **sqlmap** (SQL injection testing)
- **jwt_tool** (JWT analysis)
- **Nmap** (port scanning)
- **Browser Developer Tools**
- **curl** / **httpie**

## Authentication Testing

### 1. Password Policy Testing
**Objective**: Verify password strength requirements

**Test Cases**:
```bash
# Test weak passwords
- [ ] Test password < 12 characters → Should reject
- [ ] Test password without complexity → Should reject
- [ ] Test common passwords (e.g., "Password123!") → Should reject
- [ ] Test breached passwords → Should reject (HaveIBeenPwned)
- [ ] Test valid strong password → Should accept
```

**Expected Behavior**:
- Minimum 12 characters required
- At least 3 of: uppercase, lowercase, digit, special char
- Breached passwords rejected

---

### 2. Brute-Force Protection Testing
**Objective**: Verify account lockout and rate limiting

**Test Cases**:
```bash
# Automated brute-force attack
for i in {1..10}; do
  curl -X POST https://app.janazapp.nl/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong'$i'"}'
  sleep 1
done
```

**Expected Behavior**:
- [ ] First 2 failures: 2-second delay
- [ ] 3-4 failures: 5-second delay + CAPTCHA required
- [ ] 5+ failures: 30-second delay + account locked (15 min)
- [ ] Rate limit: Max 100 requests/min per IP

---

### 3. Two-Factor Authentication (2FA) Testing
**Objective**: Verify 2FA implementation security

**Test Cases**:
```bash
# Bypass attempts
- [ ] Try to skip 2FA by manipulating redirect → Should fail
- [ ] Try to reuse old TOTP code → Should reject (replay protection)
- [ ] Try TOTP code from different time period → Should reject
- [ ] Try recovery code twice → Should only work once
- [ ] Verify TOTP secret is not exposed in API responses
```

**Expected Behavior**:
- TOTP codes valid for 30-second window (±1 period)
- Replay protection prevents reuse within 5 minutes
- Recovery codes are single-use
- 2FA mandatory for professional roles

---

### 4. Device Trust Testing
**Objective**: Verify device trust mechanism security

**Test Cases**:
```bash
# Device trust token manipulation
- [ ] Steal device trust cookie → Try on different browser
- [ ] Modify device fingerprint → Should invalidate trust
- [ ] Change IP address significantly → Should increase risk score
- [ ] Try expired device token → Should require 2FA
```

**Expected Behavior**:
- Device trust cookie: HttpOnly, Secure, SameSite=Strict
- Token expires after 30 days
- High risk score (50+) forces 2FA
- Token rotates every 7 days

---

### 5. Password Reset Testing
**Objective**: Verify password reset security

**Test Cases**:
```bash
# Reset flow manipulation
- [ ] Request reset for non-existent email → No user enumeration
- [ ] Try to reuse reset token → Should reject
- [ ] Try expired reset token (>60 min) → Should reject
- [ ] Request 4+ resets in 1 hour → Should rate limit
- [ ] Professional account reset → Should require 2FA
```

**Expected Behavior**:
- Reset link valid for 60 minutes (single-use)
- Rate limit: 3 requests/hour per email
- No user enumeration (same response for valid/invalid email)
- Email notification on successful password change

---

## Authorization Testing

### 6. Role-Based Access Control (RBAC) Testing
**Objective**: Verify proper authorization for each role

**Test Matrix**:

| Action | Family | FD | Mosque | Wasplaats | Insurer | Org Admin | Platform Admin |
|--------|--------|----|----|-----------|---------|-----------|----------------|
| View own dossier | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View other dossier | ❌ | ✅* | ✅* | ✅* | ✅* | ✅* | ✅ |
| Create dossier | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete dossier | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload documents | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Review documents | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅** | ✅ |
| Verify organizations | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

\* Only within their organization  
\*\* Only within their organization

**Test Cases**:
```bash
# IDOR (Insecure Direct Object Reference) Testing
- [ ] Family user tries to access dossier_id of another family → 403 Forbidden
- [ ] Funeral Director tries to access dossier from different org → 403 Forbidden
- [ ] Org Admin tries to manage user from different org → 403 Forbidden
- [ ] Non-admin tries to access /admin routes → Redirect to dashboard
```

---

### 7. Row-Level Security (RLS) Testing
**Objective**: Verify database-level authorization

**Test Cases** (via API):
```sql
-- Test RLS policies directly
SELECT * FROM dossiers WHERE id = '<other-user-dossier-id>';
-- Should return empty for unauthorized users

UPDATE user_roles SET role = 'platform_admin' WHERE user_id = auth.uid();
-- Should fail (RLS prevents privilege escalation)

DELETE FROM audit_events WHERE id = '<any-id>';
-- Should fail (audit logs are immutable)
```

**Tools**: Use Postman or curl to make API calls as different users

---

## Input Validation Testing

### 8. SQL Injection Testing
**Objective**: Verify protection against SQL injection

**Test Cases**:
```bash
# Common SQL injection payloads
- [ ] ' OR '1'='1
- [ ] '; DROP TABLE dossiers; --
- [ ] ' UNION SELECT NULL, NULL, NULL --
- [ ] admin'--
- [ ] ' OR 1=1 --

# Test in all input fields:
- [ ] Login email/password
- [ ] Dossier search
- [ ] Document filters
- [ ] User management filters
```

**Tool**: `sqlmap -u "https://app.janazapp.nl/api/dossiers?search=test" --cookie="..."`

**Expected Behavior**: All inputs should be sanitized, parameterized queries used

---

### 9. Cross-Site Scripting (XSS) Testing
**Objective**: Verify XSS protection

**Test Cases**:
```html
<!-- Reflected XSS payloads -->
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')

<!-- Stored XSS (in database fields) -->
- [ ] Dossier notes field: <script>alert('XSS')</script>
- [ ] User profile fields: <img src=x onerror=alert('XSS')>
- [ ] Document descriptions: <svg onload=alert('XSS')>
```

**Tool**: Burp Suite XSS Scanner

**Expected Behavior**:
- React auto-escapes all JSX output
- No `dangerouslySetInnerHTML` usage
- Content Security Policy (CSP) headers present

---

### 10. File Upload Testing
**Objective**: Verify secure file upload handling

**Test Cases**:
```bash
# Malicious file uploads
- [ ] Upload .exe file disguised as .pdf → Should reject
- [ ] Upload file with XSS in filename: <script>alert('XSS')</script>.pdf
- [ ] Upload oversized file (>10MB) → Should reject
- [ ] Upload file with double extension: malware.pdf.exe
- [ ] Upload PHP/JSP shell: shell.php
```

**Expected Behavior**:
- File type validation (MIME type + extension)
- File size limits enforced
- Files stored in encrypted bucket
- Presigned URLs for download (time-limited)

---

## Session Management Testing

### 11. Session Fixation Testing
**Objective**: Verify session tokens are regenerated

**Test Cases**:
```bash
# Session fixation attack
1. Get session token before login
2. Login with valid credentials
3. Check if session token changed → Should be different
```

**Expected Behavior**: New session token issued on login

---

### 12. Session Timeout Testing
**Objective**: Verify session expiration

**Test Cases**:
```bash
# Inactivity timeout
1. Login successfully
2. Wait 12 hours without activity
3. Try to access protected resource → Should redirect to login

# Absolute timeout
1. Login successfully
2. Make requests every 11 hours for 30 days
3. On day 31, session should expire
```

**Expected Behavior**:
- Inactivity timeout: 12 hours
- Sessions cleaned up after 30 days

---

### 13. Concurrent Session Testing
**Objective**: Verify concurrent session handling

**Test Cases**:
```bash
# Multiple device login
1. Login from Browser A
2. Login from Browser B (same user)
3. Both sessions should work independently
4. Logout from Browser A
5. Browser B should still work
```

**Expected Behavior**: Multiple sessions allowed, independent lifecycle

---

## Cryptography Testing

### 14. TLS/SSL Configuration Testing
**Objective**: Verify encryption in transit

**Test Cases**:
```bash
# SSL/TLS testing
nmap --script ssl-enum-ciphers -p 443 app.janazapp.nl

# Check for:
- [ ] TLS 1.2 minimum (no SSL, TLS 1.0, TLS 1.1)
- [ ] Strong cipher suites only
- [ ] Valid certificate chain
- [ ] HSTS header present
```

**Tool**: `sslscan app.janazapp.nl`

**Expected Behavior**:
- TLS 1.2+ only
- A+ rating on SSL Labs
- HSTS enabled

---

### 15. Sensitive Data Exposure Testing
**Objective**: Verify data encryption at rest

**Test Cases**:
```bash
# Check for exposed sensitive data
- [ ] Passwords in database → Should be hashed (bcrypt)
- [ ] NIS numbers → Should be encrypted (field-level)
- [ ] 2FA secrets → Should be encrypted
- [ ] API responses → Should not expose sensitive fields
- [ ] Error messages → Should not leak sensitive info
```

**Database Check**:
```sql
SELECT * FROM profiles WHERE email = 'test@example.com';
-- NIS field should be encrypted (not plaintext)
```

---

## Business Logic Testing

### 16. Workflow Testing
**Objective**: Verify business logic cannot be bypassed

**Test Cases**:
```bash
# Dossier workflow bypass attempts
- [ ] Try to skip intake → Go directly to planning
- [ ] Try to confirm mosque without intake complete
- [ ] Try to generate invoice without services complete
- [ ] Try to close dossier with pending tasks
```

**Expected Behavior**: Workflow enforced server-side, not just UI

---

### 17. GDPR Request Testing
**Objective**: Verify GDPR functionality

**Test Cases**:
```bash
# Data export request
- [ ] Request data export → Should create pending request
- [ ] Request second export while first pending → Should reject
- [ ] Export should include: profile, roles, audit events

# Data deletion request
- [ ] Request data deletion → Should create pending request
- [ ] Request second deletion while first pending → Should reject
- [ ] Deletion should be logged in audit trail
```

---

## API Security Testing

### 18. Rate Limiting Testing
**Objective**: Verify API rate limits

**Test Script**:
```bash
#!/bin/bash
# Test rate limiting
for i in {1..150}; do
  curl -X GET https://app.janazapp.nl/api/dossiers \
    -H "Authorization: Bearer $TOKEN" \
    -w "%{http_code}\n" -o /dev/null
  sleep 0.1
done
# Should see 429 (Too Many Requests) after ~100 requests
```

**Expected Behavior**: 429 status after 100 requests/min per IP

---

### 19. CORS Testing
**Objective**: Verify CORS configuration

**Test Cases**:
```bash
# Cross-origin requests
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  https://app.janazapp.nl/api/dossiers

# Check response headers:
- [ ] Access-Control-Allow-Origin should not be *
- [ ] Only trusted origins allowed
```

---

### 20. Webhook Security Testing
**Objective**: Verify webhook signature validation

**Test Cases**:
```bash
# WhatsApp webhook tampering
- [ ] Send webhook without signature → Should reject
- [ ] Send webhook with invalid signature → Should reject
- [ ] Replay old webhook message → Should detect
```

**Expected Behavior**: Webhook signature verified server-side

---

## Post-Test Activities

### Report Structure
1. **Executive Summary**
   - Overall risk rating
   - Critical findings
   - Recommendations

2. **Detailed Findings**
   - For each vulnerability:
     - Description
     - Severity (Critical/High/Medium/Low)
     - Steps to reproduce
     - Proof of concept
     - Remediation advice

3. **Testing Metrics**
   - Tests performed
   - Vulnerabilities found
   - Risk distribution

### Severity Classification

| Severity | Criteria | Example |
|----------|----------|---------|
| **Critical** | Remote code execution, full data breach | SQL injection with DB access |
| **High** | Privilege escalation, authentication bypass | Admin role escalation |
| **Medium** | Information disclosure, partial bypass | User enumeration |
| **Low** | Minor information leak, UI issues | Verbose error messages |

### Remediation Timeline
- **Critical**: Fix within 7 days
- **High**: Fix within 14 days
- **Medium**: Fix within 30 days
- **Low**: Fix within 90 days

---

## Automated Testing Script

```bash
#!/bin/bash
# security-test.sh - Automated security testing

echo "🔒 Starting Security Tests..."

# 1. Dependency vulnerabilities
echo "📦 Checking dependencies..."
npm audit --audit-level=high

# 2. Secret scanning
echo "🔑 Scanning for secrets..."
docker run --rm -v "$PWD:/scan" trufflesecurity/trufflehog:latest filesystem /scan

# 3. OWASP ZAP scan (baseline)
echo "🕷️ Running OWASP ZAP..."
docker run --rm -v $(pwd):/zap/wrk/:rw owasp/zap2docker-stable \
  zap-baseline.py -t https://staging.janazapp.nl -r zap-report.html

# 4. SSL/TLS check
echo "🔐 Checking SSL/TLS..."
docker run --rm nmap/nmap --script ssl-enum-ciphers -p 443 staging.janazapp.nl

echo "✅ Security tests complete! Check reports for findings."
```

**Run weekly**: `./security-test.sh`

---

## Security Testing Checklist

### Pre-Production Checklist
- [ ] All critical/high vulnerabilities resolved
- [ ] Penetration test completed and signed off
- [ ] STRIDE threat model reviewed
- [ ] Security training completed for team
- [ ] Incident response plan documented
- [ ] Backup and recovery tested
- [ ] Monitoring and alerting configured
- [ ] Security headers verified (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting tested
- [ ] Authentication flows tested (including 2FA)
- [ ] Authorization (RLS) tested for all roles
- [ ] Input validation tested (SQL injection, XSS)
- [ ] Session management tested
- [ ] Cryptography verified (TLS 1.2+, encryption at rest)
- [ ] GDPR compliance verified
- [ ] Audit logging tested
- [ ] PII redaction tested

---

## Resources

### OWASP Resources
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)

### Tools
- [Burp Suite](https://portswigger.net/burp)
- [OWASP ZAP](https://www.zaproxy.org/)
- [sqlmap](https://sqlmap.org/)
- [Nmap](https://nmap.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

### Contact
For questions about security testing:
- **Email**: security@janazapp.nl
- **Security Coordinator**: Platform Admin

---

Last Updated: 2025-10-03  
Next Review: 2025-11-03
