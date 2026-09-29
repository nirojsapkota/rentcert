import "server-only";
import { ADDRESS_QUERY_MAX, ADDRESS_QUERY_MIN, type AddressSuggestion } from "@/lib/address-suggestion";
import { AUSTRALIAN_STATES } from "@/lib/property-validation";
import { reportError } from "@/server/observability";

// Address autocomplete through Geoapify (free plan: 3,000 requests a day, commercial use allowed
// with attribution, which the property form shows). Australian addresses only. The API key stays on
// the server; the browser calls /api/address-search. Query text is never logged.

const ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const TIMEOUT_MS = 3000;
const RESULTS = 5;

export function addressLookupEnabled(): boolean {
  const key = process.env.GEOAPIFY_API_KEY;
  return Boolean(key && key !== "unset");
}

type GeoapifyResult = {
  housenumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  state_code?: string;
  postcode?: string;
  formatted?: string;
  country_code?: string;
};

function stateCode(result: GeoapifyResult): string {
  const byCode = AUSTRALIAN_STATES.find((state) => state.code === result.state_code?.toUpperCase());
  const byName = AUSTRALIAN_STATES.find((state) => state.name.toLowerCase() === result.state?.toLowerCase());
  return (byCode ?? byName)?.code ?? "";
}

export function toSuggestion(result: GeoapifyResult): AddressSuggestion | null {
  if (result.country_code && result.country_code !== "au") return null;
  if (!result.street) return null;
  const addressLine1 = result.housenumber ? `${result.housenumber} ${result.street}` : result.street;
  const postcode = /^\d{4}$/.test(result.postcode ?? "") ? result.postcode! : "";
  return {
    label: result.formatted ?? addressLine1,
    addressLine1,
    suburb: result.suburb ?? result.city ?? result.town ?? result.village ?? "",
    state: stateCode(result),
    postcode,
  };
}

// Small in-memory limit per user (one web process; the provider's daily quota is the real cap).
const WINDOW_MS = 60_000;
const PER_WINDOW = 30;
const recent = new Map<string, number[]>();

export function allowSearch(userId: string, now = Date.now()): boolean {
  const hits = (recent.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= PER_WINDOW) {
    recent.set(userId, hits);
    return false;
  }
  hits.push(now);
  recent.set(userId, hits);
  if (recent.size > 10_000) recent.clear();
  return true;
}

export async function searchAddresses(query: string, fetcher: typeof fetch = fetch): Promise<AddressSuggestion[]> {
  const text = query.trim();
  if (!addressLookupEnabled() || text.length < ADDRESS_QUERY_MIN || text.length > ADDRESS_QUERY_MAX) return [];
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    text,
    filter: "countrycode:au",
    lang: "en",
    limit: String(RESULTS),
    format: "json",
    apiKey: process.env.GEOAPIFY_API_KEY!,
  }).toString();

  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) {
      reportError("address", `address search failed with status ${response.status}`, new Error("AddressSearchFailed"));
      return [];
    }
    const body = (await response.json()) as { results?: GeoapifyResult[] };
    const seen = new Set<string>();
    return (body.results ?? []).flatMap((result) => {
      const suggestion = toSuggestion(result);
      if (!suggestion || seen.has(suggestion.label)) return [];
      seen.add(suggestion.label);
      return [suggestion];
    });
  } catch (error) {
    // Autocomplete is a convenience: the form still works by typing the address.
    reportError("address", "address search unavailable", error);
    return [];
  }
}
