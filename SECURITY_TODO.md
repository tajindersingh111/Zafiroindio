# Security Action Required: Key Rotation & Sanitization Notice

> [!CAUTION]
> **CRITICAL SECURITY ACTION REQUIRED**

The following API keys and database credentials were exposed in plain text in source configuration files and commit history. You **MUST** perform key rotation for all exposed service credentials immediately.

---

## Required Key Rotation Tasks

### 1. PostgreSQL Database Credentials
- **Action:** Change the password for the database user on Railway / PostgreSQL host.
- **Update Environment Variable:** Update `DATABASE_URL` in your hosting platform dashboard (Railway / Vercel) with the newly generated password.

### 2. Shiprocket Credentials
- **Action:** Log in to your Shiprocket Seller Console ([https://app.shiprocket.in](https://app.shiprocket.in)) and navigate to **API Settings**.
- **Regenerate:**
  - Reset your Shiprocket Account Password.
  - Regenerate API Secret / Integration Tokens for Fastrr / 1-Click Checkout.
- **Update Environment Variables:** Set `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_API_KEY`, and `SHIPROCKET_SECRET_KEY` in deployment environment settings.

### 3. Fast2SMS Credentials (If Active)
- **Action:** Log in to Fast2SMS dashboard ([https://www.fast2sms.com](https://www.fast2sms.com)) and regenerate your API Key.
- **Update Environment Variable:** Set `FAST2SMS_API_KEY`.

### 4. Razorpay Credentials (If Active)
- **Action:** Log in to Razorpay Dashboard ([https://dashboard.razorpay.com](https://dashboard.razorpay.com)) -> **Settings** -> **API Keys**.
- **Regenerate:** Roll API Keys and generate new Webhook Secrets.
- **Update Environment Variables:** Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

---

## Optional: Git History Scrubbing
If this repository is hosted publicly or shared with third parties, consider scrubbing historical commits using `git-filter-repo` or BFG Repo Cleaner to purge exposed commit blobs.
