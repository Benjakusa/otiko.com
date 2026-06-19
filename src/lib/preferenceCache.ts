import { hasConsent, onConsentChange } from "./cookieConsent";

const PREFIX = "otiko_pref_";

export type PreferenceKey = "sidebarCollapsed" | "lastDashboardView" | "theme" | "locale" | "pageSize" | "lastFilter";

const DEFAULTS: Record<PreferenceKey, string> = {
  sidebarCollapsed: "false",
  lastDashboardView: "overview",
  theme: "light",
  locale: "en",
  pageSize: "12",
  lastFilter: "all",
};

let functionalConsent = hasConsent("functional");

onConsentChange((consent) => {
  const hadConsent = functionalConsent;
  functionalConsent = consent?.functional === true;
  if (hadConsent && !functionalConsent) {
    clearAllPreferences();
  }
});

function isFunctionalAllowed(): boolean {
  return functionalConsent;
}

export function getPreference(key: PreferenceKey): string {
  if (!isFunctionalAllowed()) return DEFAULTS[key];
  try {
    return localStorage.getItem(PREFIX + key) || DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}

export function setPreference(key: PreferenceKey, value: string): void {
  if (!isFunctionalAllowed()) return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage full or unavailable */
  }
}

export function clearAllPreferences(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export function getPreferenceKeys(): { key: PreferenceKey; label: string; description: string }[] {
  return [
    { key: "sidebarCollapsed", label: "Sidebar State", description: "Whether the dashboard sidebar is collapsed or expanded" },
    { key: "lastDashboardView", label: "Default Dashboard Tab", description: "Last selected view on the dashboard overview" },
    { key: "theme", label: "Theme Preference", description: "Light or dark display theme" },
    { key: "locale", label: "Language / Locale", description: "Selected language for the interface" },
    { key: "pageSize", label: "Results Per Page", description: "Number of items shown per page in list views" },
    { key: "lastFilter", label: "Last Active Filter", description: "Most recently used filter on inventory or event listings" },
  ];
}
