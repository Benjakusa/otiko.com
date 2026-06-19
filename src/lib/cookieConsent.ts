const CONSENT_KEY = "otiko_cookie_consent";

export interface ConsentSettings {
  version: number;
  timestamp: string;
  essential: boolean;
  functional: boolean;
  analytics: boolean;
}

const DEFAULT_CONSENT: ConsentSettings = {
  version: 1,
  timestamp: "",
  essential: true,
  functional: false,
  analytics: false,
};

export function getConsent(): ConsentSettings | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version && parsed.essential === true) {
      return parsed as ConsentSettings;
    }
    return null;
  } catch {
    return null;
  }
}

export function setConsent(choices: Partial<ConsentSettings>): ConsentSettings {
  const current = getConsent() || { ...DEFAULT_CONSENT };
  const merged: ConsentSettings = {
    ...current,
    ...choices,
    timestamp: new Date().toISOString(),
    version: 1,
    essential: true,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(merged));
  return merged;
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

export function hasConsent(category: "essential" | "functional" | "analytics"): boolean {
  const consent = getConsent();
  if (!consent) return false;
  if (category === "essential") return consent.essential;
  if (category === "functional") return consent.functional;
  if (category === "analytics") return consent.analytics;
  return false;
}

export function onConsentChange(callback: (consent: ConsentSettings | null) => void): () => void {
  const handler = () => {
    callback(getConsent());
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
