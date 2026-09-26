declare namespace Cloudflare {
  interface Env {
    CKK_BILLING_MODE?: string;
    CKK_BILLING_READY?: string;
    CKK_CHECKOUT_OPEN?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    CKK_LEGAL_NAME?: string;
    CKK_SUPPORT_EMAIL?: string;
    CKK_TERMS_URL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    BETTER_AUTH_SECRET?: string;
    CKK_APP_ORIGIN?: string;
    CKK_OWNER_EMAIL?: string;
    CKK_OWNER_SETUP_HASH?: string;
    CKK_OWNER_SETUP_EXPIRES?: string;
    CKK_OWNER_LEGACY_PROFILE_ID?: string;
  }
}
