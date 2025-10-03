# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to security@janazapp.nl with:

1. **Description**: A clear description of the vulnerability
2. **Impact**: The potential impact of the vulnerability
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Proof of Concept**: If possible, include a proof of concept
5. **Suggested Fix**: If you have a suggested fix, please include it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Critical vulnerabilities within 14 days, others within 30 days

## Security Measures

### Authentication & Authorization
- ✅ 2FA mandatory for professional accounts (TOTP-based)
- ✅ Optional 2FA for family accounts
- ✅ Session timeout after 12 hours of inactivity
- ✅ Device trust (30-day "remember device")
- ✅ Minimum password length: 12 characters
- ✅ Breached password checking (HaveIBeenPwned integration)
- ✅ Brute-force protection: max 5 attempts, progressive delay + CAPTCHA

### Data Protection
- ✅ TLS 1.2+ enforced on all endpoints
- ✅ Database encryption at rest (AES-256)
- ✅ Field-level encryption for sensitive data (NIS)
- ✅ Secrets managed via Vault/KMS
- ✅ Object storage encryption + presigned URLs

### Audit & Logging
- ✅ Immutable audit logs for critical actions
- ✅ PII redaction in logs
- ✅ Access logs (IP, user agent, timestamp)
- ✅ Centralized logging

### Rate Limiting
- ✅ API endpoints rate-limited (100 req/min per IP)
- ✅ Login/reset endpoints: CAPTCHA after 3 failures
- ✅ Throttling on external API calls

### GDPR Compliance
- ✅ Data retention policies implemented
- ✅ Right to access (data export)
- ✅ Right to be forgotten (data deletion)
- ✅ Privacy Policy & Terms of Service
- ✅ DPA agreements framework

### Vulnerability Management
- ✅ Automated dependency scanning (Dependabot + Snyk)
- ✅ Weekly security patch runs
- ✅ CodeQL static analysis
- ✅ Secret scanning (TruffleHog)
- ✅ STRIDE threat model

## Security Best Practices for Contributors

### Code Review Checklist
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper output encoding)
- [ ] CSRF protection enabled
- [ ] Authentication checks on protected routes
- [ ] Authorization checks for sensitive operations
- [ ] Sensitive data encrypted at rest and in transit
- [ ] PII properly redacted in logs
- [ ] Rate limiting applied to endpoints

### Dependency Management
1. **Before adding a new dependency**:
   - Check the package's security history
   - Review the package's maintenance status
   - Verify the package license
   - Run `npm audit` after installation

2. **Regular updates**:
   - Review Dependabot PRs weekly
   - Test updates in staging before production
   - Document breaking changes

### Secret Management
- Never commit secrets to version control
- Use Supabase Vault for secret storage
- Rotate secrets regularly (at least every 90 days)
- Use environment-specific secrets

## Dependency Scanning

### Automated Scanning
We use multiple tools for comprehensive vulnerability detection:

1. **Dependabot**: Automated dependency updates and security alerts
2. **npm audit**: Built-in npm vulnerability scanning
3. **Snyk**: Advanced vulnerability scanning with remediation advice
4. **CodeQL**: Static code analysis for security vulnerabilities
5. **TruffleHog**: Secret scanning in git history

### Manual Security Checks

Run these commands locally before committing:

```bash
# Check for vulnerabilities
npm audit

# Check for high/critical vulnerabilities only
npm audit --audit-level=high

# Check for outdated packages
npm outdated

# Update packages (after review)
npm update

# Fix vulnerabilities automatically (patch/minor updates)
npm audit fix
```

### Weekly Security Routine

Every Monday at 9:00 AM UTC, our automated workflow:
1. Scans all dependencies for vulnerabilities
2. Creates PRs for security updates
3. Runs CodeQL analysis
4. Scans for exposed secrets
5. Generates security report

## Penetration Testing

See [SECURITY_TESTING.md](./docs/SECURITY_TESTING.md) for our penetration testing methodology and checklist.

## Threat Model

See [THREAT_MODEL.md](./docs/THREAT_MODEL.md) for our STRIDE-based threat model analysis.

## Security Contact

For security-related questions or concerns, contact:
- **Email**: security@janazapp.nl
- **Response Time**: Within 48 hours

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities to us. We will acknowledge your contribution in our security hall of fame (unless you prefer to remain anonymous).
