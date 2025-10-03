# Threat Model - STRIDE Analysis

This document outlines the threat model for JanazApp using the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

## Table of Contents
- [System Overview](#system-overview)
- [Assets](#assets)
- [Trust Boundaries](#trust-boundaries)
- [STRIDE Analysis](#stride-analysis)
- [Mitigations](#mitigations)
- [Risk Assessment](#risk-assessment)

## System Overview

JanazApp is a comprehensive funeral management system with multiple user roles:
- **Family**: Access to their deceased relative's dossier
- **Funeral Directors**: Manage dossiers, documents, planning
- **Mosque**: Confirm ceremonies, manage schedules
- **Wasplaats**: Manage washing facilities, cooling cells
- **Insurer**: View dossiers, invoices, reports
- **Org Admin**: Manage organization users and settings
- **Platform Admin**: Manage organizations and system-wide settings

### Key Components
1. **Frontend**: React SPA (TypeScript, Vite)
2. **Backend**: Lovable Cloud (Supabase)
3. **Database**: PostgreSQL with RLS policies
4. **Authentication**: Supabase Auth with 2FA
5. **Storage**: Encrypted object storage for documents
6. **External APIs**: WhatsApp webhook, email notifications

## Assets

### Critical Assets
1. **PII (Personally Identifiable Information)**
   - Names, addresses, dates of birth
   - BSN/NIS numbers (encrypted)
   - Contact information
   - Family relationships

2. **Authentication Credentials**
   - Passwords (hashed)
   - 2FA secrets (TOTP)
   - Session tokens
   - Device trust tokens
   - Recovery codes

3. **Documents**
   - Death certificates
   - Identity documents
   - Medical reports
   - Insurance documents

4. **Business Data**
   - Dossier information
   - Invoices
   - Planning schedules
   - Audit logs

5. **System Secrets**
   - API keys
   - Database credentials
   - Encryption keys
   - Webhook secrets

## Trust Boundaries

### External Trust Boundary
- **Internet** ↔ **Application Frontend**
  - Risk: Malicious users, MITM attacks
  - Protection: TLS 1.2+, CORS, CSP headers

### Application Trust Boundary
- **Frontend** ↔ **Backend API**
  - Risk: Unauthorized API access, data exfiltration
  - Protection: Authentication, authorization, rate limiting

### Data Trust Boundary
- **Backend API** ↔ **Database**
  - Risk: SQL injection, data tampering
  - Protection: RLS policies, parameterized queries, encryption

### Integration Trust Boundary
- **Backend** ↔ **External APIs** (WhatsApp, Email)
  - Risk: Data leakage, webhook abuse
  - Protection: Webhook signatures, rate limiting, input validation

## STRIDE Analysis

### S - Spoofing Identity

#### Threat: Attacker impersonates a legitimate user
**Attack Vectors**:
- Stolen credentials (phishing)
- Session hijacking
- Token replay attacks
- Weak authentication

**Mitigations**:
- ✅ Strong password requirements (min 12 chars, complexity)
- ✅ Breached password checking (HaveIBeenPwned)
- ✅ 2FA mandatory for professionals (TOTP)
- ✅ Device trust with secure cookie (HttpOnly, Secure, SameSite)
- ✅ Session timeout (12 hours inactivity)
- ✅ IP and User-Agent tracking
- ✅ TOTP replay protection (period-based guards)

**Residual Risk**: Low

---

### T - Tampering with Data

#### Threat: Attacker modifies data in transit or at rest
**Attack Vectors**:
- MITM attacks
- Database manipulation
- API request tampering
- Document modification

**Mitigations**:
- ✅ TLS 1.2+ enforced (in-transit encryption)
- ✅ Database encryption at rest (AES-256)
- ✅ Field-level encryption for sensitive data (NIS)
- ✅ Row-Level Security (RLS) policies
- ✅ Immutable audit logs (prevent modifications)
- ✅ Document integrity (stored in encrypted buckets)
- ✅ CORS restrictions
- ✅ Input validation (zod schemas)

**Residual Risk**: Low

---

### R - Repudiation

#### Threat: User denies performing an action
**Attack Vectors**:
- No proof of actions
- Incomplete audit trails
- Missing attribution

**Mitigations**:
- ✅ Comprehensive audit logging for critical actions:
  - Login/logout events
  - Dossier status changes
  - Document reviews/uploads
  - Role changes
  - Organization verification
  - GDPR requests
  - QR token generation/revocation
  - 2FA setup/changes
- ✅ Immutable audit logs (cannot be deleted or modified)
- ✅ User ID + timestamp + IP + User-Agent logged
- ✅ PII redaction in logs (for privacy)
- ✅ Centralized logging

**Residual Risk**: Very Low

---

### I - Information Disclosure

#### Threat: Unauthorized access to sensitive information
**Attack Vectors**:
- SQL injection
- Broken access control
- Insecure storage
- PII in logs
- XSS attacks
- API data leakage

**Mitigations**:
- ✅ Row-Level Security (RLS) enforced on all tables
- ✅ Parameterized queries (Supabase client)
- ✅ PII redaction in logs (emails, phone, BSN, IP, credit cards)
- ✅ Field-level encryption (NIS)
- ✅ Presigned URLs for document access (time-limited)
- ✅ Role-based access control (RBAC)
- ✅ XSS prevention (React auto-escaping, no dangerouslySetInnerHTML)
- ✅ Secure headers (CSP, X-Frame-Options)
- ✅ QR codes use opaque tokens (no PII)
- ✅ Rate limiting on API endpoints

**Residual Risk**: Low

---

### D - Denial of Service

#### Threat: Attacker makes the system unavailable
**Attack Vectors**:
- API flooding
- Brute-force login attempts
- Resource exhaustion
- Webhook spam

**Mitigations**:
- ✅ Rate limiting:
  - API endpoints: 100 req/min per IP
  - Login attempts: 5 max, progressive delay
  - Password reset: 3 req/hour per email
  - GDPR requests: 1 pending per user
- ✅ CAPTCHA after failed login attempts
- ✅ Account lockout (5 failed attempts = 30s delay)
- ✅ Session cleanup (expired sessions deleted)
- ✅ Database query optimization
- ✅ Indexed queries
- ✅ Webhook verification (signatures)
- ✅ Circuit breaker on external APIs

**Residual Risk**: Medium (external DDoS still possible, mitigated by CDN/WAF at infrastructure level)

---

### E - Elevation of Privilege

#### Threat: Attacker gains higher privileges than authorized
**Attack Vectors**:
- Broken authorization
- Insecure direct object references (IDOR)
- SQL injection
- API abuse
- Role manipulation

**Mitigations**:
- ✅ Row-Level Security (RLS) policies on all tables
- ✅ Role-based access control (RBAC):
  - Platform Admin > Org Admin > Professional roles > Family
- ✅ Minimum 1 Org Admin per organization (cannot delete last admin)
- ✅ Role change audit logging
- ✅ Authorization checks in RLS policies:
  - Users can only access their own dossiers
  - Professionals can only access org-related dossiers
  - Admins can only manage their organization
- ✅ Function security (SECURITY DEFINER with explicit checks)
- ✅ No privilege escalation through invitation codes (role assigned by Org Admin)
- ✅ API endpoints check `auth.uid()` and roles

**Residual Risk**: Low

---

## Attack Scenarios & Mitigations

### Scenario 1: Credential Theft via Phishing
**Attack**: Attacker sends phishing email to user, steals password.

**Mitigations**:
1. ✅ 2FA required for professionals → Even with password, attacker needs TOTP code
2. ✅ Device trust → New device triggers 2FA requirement
3. ✅ IP/User-Agent tracking → Suspicious login patterns detected
4. ✅ Email notification on password change
5. ✅ Breached password check → Prevents use of known compromised passwords

**Result**: Attack prevented or detected early.

---

### Scenario 2: Brute-Force Password Attack
**Attack**: Attacker tries to guess passwords via login form.

**Mitigations**:
1. ✅ Rate limiting (5 attempts max)
2. ✅ Progressive delay (2s → 5s → 30s)
3. ✅ CAPTCHA after 3 failures
4. ✅ Account lockout (15 minutes after 5 failures)
5. ✅ Strong password requirements (12+ chars, complexity)

**Result**: Attack becomes impractical (would take years to crack).

---

### Scenario 3: SQL Injection
**Attack**: Attacker attempts SQL injection via API parameters.

**Mitigations**:
1. ✅ Supabase client uses parameterized queries
2. ✅ RLS policies prevent unauthorized data access
3. ✅ Input validation (zod schemas)
4. ✅ No raw SQL in frontend code

**Result**: Attack prevented at multiple layers.

---

### Scenario 4: XSS Attack
**Attack**: Attacker injects malicious script via user input.

**Mitigations**:
1. ✅ React auto-escapes all JSX output
2. ✅ No use of `dangerouslySetInnerHTML`
3. ✅ Content Security Policy (CSP) headers
4. ✅ Input validation and sanitization

**Result**: XSS attacks prevented.

---

### Scenario 5: IDOR (Insecure Direct Object Reference)
**Attack**: Attacker changes dossier ID in URL to access other users' data.

**Mitigations**:
1. ✅ RLS policies check `auth.uid()` and user roles
2. ✅ Dossier access restricted by family relationship or professional role
3. ✅ API returns 403 Forbidden for unauthorized access

**Result**: Attack prevented by RLS.

---

### Scenario 6: Session Hijacking
**Attack**: Attacker steals session token via XSS or network sniffing.

**Mitigations**:
1. ✅ HttpOnly cookies (prevents XSS access)
2. ✅ Secure flag (HTTPS only)
3. ✅ SameSite=Strict (prevents CSRF)
4. ✅ TLS 1.2+ (prevents network sniffing)
5. ✅ 12-hour session timeout
6. ✅ Device trust validation

**Result**: Attack prevented or limited in scope.

---

## Risk Assessment Matrix

| Threat Category | Likelihood | Impact | Risk Level | Mitigation Status |
|----------------|------------|--------|------------|-------------------|
| Credential Theft | Medium | High | **Medium** | ✅ Mitigated (2FA, device trust) |
| Brute-Force | High | Medium | **Medium** | ✅ Mitigated (rate limiting, CAPTCHA) |
| SQL Injection | Low | Critical | **Medium** | ✅ Mitigated (RLS, parameterized queries) |
| XSS | Low | High | **Low** | ✅ Mitigated (React, CSP) |
| IDOR | Medium | High | **Medium** | ✅ Mitigated (RLS policies) |
| Session Hijacking | Low | High | **Low** | ✅ Mitigated (secure cookies, TLS) |
| Data Tampering | Low | Critical | **Low** | ✅ Mitigated (encryption, RLS) |
| Information Disclosure | Medium | Critical | **Medium** | ✅ Mitigated (RLS, encryption, PII redaction) |
| Denial of Service | Medium | Medium | **Medium** | ⚠️ Partial (rate limiting, needs WAF) |
| Privilege Escalation | Low | Critical | **Low** | ✅ Mitigated (RLS, RBAC) |

## Security Recommendations

### High Priority
1. ✅ **Implemented**: All STRIDE threats have primary mitigations
2. ⚠️ **Consider**: Web Application Firewall (WAF) for DDoS protection
3. ⚠️ **Consider**: Intrusion Detection System (IDS) for anomaly detection

### Medium Priority
1. ⚠️ **Consider**: Security Information and Event Management (SIEM) integration
2. ⚠️ **Consider**: Regular penetration testing (at least annually)
3. ⚠️ **Consider**: Bug bounty program

### Ongoing
1. ✅ Weekly dependency scans (Dependabot)
2. ✅ Automated security testing (CodeQL, Snyk)
3. ⚠️ **Plan**: Quarterly threat model review
4. ⚠️ **Plan**: Security awareness training for team

## Conclusion

The JanazApp threat model identifies and addresses all major STRIDE categories with comprehensive mitigations. The primary residual risks are:

1. **Infrastructure-level DDoS**: Mitigated by Lovable Cloud's infrastructure
2. **Social Engineering**: Requires user education and awareness
3. **Zero-day vulnerabilities**: Addressed by regular dependency scanning and patching

**Overall Security Posture**: **Strong** 🛡️

Last Updated: 2025-10-03  
Next Review: 2026-01-03
