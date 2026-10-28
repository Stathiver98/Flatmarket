import "server-only";

// Central, typed access to environment configuration. Optional integrations
// expose an `isXConfigured` helper so the UI can show honest fallbacks.

function str(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  get databaseUrl() {
    return str("DATABASE_URL");
  },
  get appUrl() {
    return (str("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get appSecret(): string {
    const s = str("APP_SECRET");
    if (!s || s.length < 32) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("APP_SECRET must be set to at least 32 characters in production.");
      }
      return "insecure-development-secret-change-me-0000000000";
    }
    return s;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get trustProxy() {
    return str("TRUST_PROXY") === "true";
  },
  get signupMode(): "open" | "closed" {
    return str("SIGNUP_MODE") === "closed" ? "closed" : "open";
  },
  get adminEmails(): string[] {
    return (str("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },

  // Storage
  get storageDriver(): "local" | "s3" {
    return str("STORAGE_DRIVER") === "s3" ? "s3" : "local";
  },
  get storageLocalDir() {
    return str("STORAGE_LOCAL_DIR") ?? "./storage";
  },
  s3: {
    get bucket() {
      return str("S3_BUCKET");
    },
    get region() {
      return str("S3_REGION") ?? "auto";
    },
    get endpoint() {
      return str("S3_ENDPOINT");
    },
    get accessKeyId() {
      return str("S3_ACCESS_KEY_ID");
    },
    get secretAccessKey() {
      return str("S3_SECRET_ACCESS_KEY");
    },
    get forcePathStyle() {
      return str("S3_FORCE_PATH_STYLE") === "true";
    },
  },

  // AI text
  get anthropicApiKey() {
    return str("ANTHROPIC_API_KEY");
  },
  get aiTextModel() {
    return str("AI_TEXT_MODEL") ?? "claude-opus-5-5";
  },
  get aiTextEffort(): "low" | "medium" | "high" {
    const v = str("AI_TEXT_EFFORT");
    return v === "low" || v === "high" ? v : "medium";
  },
  get aiTextFallbacks() {
    return str("AI_TEXT_FALLBACKS") !== "off";
  },

  // Photo enhancement
  get claidApiKey() {
    return str("CLAID_API_KEY");
  },
  get claidHdrIntensity() {
    const n = Number(str("CLAID_HDR_INTENSITY") ?? "60");
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 60;
  },

  // Email
  get emailProvider(): "resend" | undefined {
    return str("EMAIL_PROVIDER") === "resend" ? "resend" : undefined;
  },
  get resendApiKey() {
    return str("RESEND_API_KEY");
  },
  get emailFrom() {
    return str("EMAIL_FROM");
  },
  get contactInboxEmail() {
    return str("CONTACT_INBOX_EMAIL");
  },
};

export function isAiTextConfigured() {
  return Boolean(env.anthropicApiKey);
}

export function isEmailConfigured() {
  return env.emailProvider === "resend" && Boolean(env.resendApiKey && env.emailFrom);
}

export function isClaidConfigured() {
  return Boolean(env.claidApiKey);
}

export function isS3Configured() {
  const s = env.s3;
  return Boolean(s.bucket && s.accessKeyId && s.secretAccessKey);
}

/** Summary used by the admin workspace and the settings page. Never includes secrets. */
export function integrationStatus() {
  return {
    database: Boolean(env.databaseUrl),
    storage: env.storageDriver === "s3" ? (isS3Configured() ? "s3" : "s3-misconfigured") : "local",
    aiText: isAiTextConfigured() ? env.aiTextModel : null,
    photoEnhancement: isClaidConfigured() ? "claid" : null,
    virtualStaging: null as string | null,
    email: isEmailConfigured() ? "resend" : null,
    appSecret: Boolean(process.env.APP_SECRET && process.env.APP_SECRET.length >= 32),
  };
}
