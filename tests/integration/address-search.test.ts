import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/address-search/route";
import { allowSearch, searchAddresses, toSuggestion } from "@/server/address/search";
import { createVerifiedUser } from "../support/auth-http";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const GEOAPIFY_RESULTS = {
  results: [
    {
      housenumber: "2",
      street: "Charmouth Place",
      suburb: "Narre Warren South",
      city: "City of Casey",
      state: "Victoria",
      state_code: "VIC",
      postcode: "3805",
      country_code: "au",
      formatted: "2 Charmouth Place, Narre Warren South VIC 3805, Australia",
    },
    { street: "Charmouth Road", city: "Perth", state: "Western Australia", postcode: "6000", country_code: "au", formatted: "Charmouth Road, Perth WA 6000, Australia" },
    { city: "Charmouth", country_code: "gb", formatted: "Charmouth, England" },
  ],
};

function stubProvider() {
  const fetchMock = vi.fn(async (_url: URL | RequestInfo) => Response.json(GEOAPIFY_RESULTS));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(q: string, cookie?: string) {
  return new Request(`http://localhost:3000/api/address-search?q=${encodeURIComponent(q)}`, { headers: cookie ? { cookie } : {} });
}

describe("address suggestions", () => {
  it("maps provider results to form fields, Australian streets only", () => {
    expect(toSuggestion(GEOAPIFY_RESULTS.results[0])).toEqual({
      label: "2 Charmouth Place, Narre Warren South VIC 3805, Australia",
      addressLine1: "2 Charmouth Place",
      suburb: "Narre Warren South",
      state: "VIC",
      postcode: "3805",
    });
    expect(toSuggestion(GEOAPIFY_RESULTS.results[1])).toMatchObject({ addressLine1: "Charmouth Road", suburb: "Perth", state: "WA" });
    expect(toSuggestion(GEOAPIFY_RESULTS.results[2])).toBeNull();
  });

  it("asks the provider for Australian results with the server-side key", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    const fetchMock = stubProvider();

    expect(await searchAddresses("2 Charmouth")).toHaveLength(2);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://api.geoapify.com/v1/geocode/autocomplete");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ text: "2 Charmouth", filter: "countrycode:au", apiKey: "test-key" });
  });

  it("returns nothing for short queries, when disabled, or when the provider fails", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    const fetchMock = stubProvider();
    expect(await searchAddresses("2 C")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 429 })));
    expect(await searchAddresses("2 Charmouth")).toEqual([]);

    vi.stubEnv("GEOAPIFY_API_KEY", "unset");
    expect(await searchAddresses("2 Charmouth")).toEqual([]);
  });

  it("limits each user to 30 searches a minute", () => {
    const now = Date.now();
    for (let index = 0; index < 30; index++) expect(allowSearch("rate-user", now)).toBe(true);
    expect(allowSearch("rate-user", now)).toBe(false);
    expect(allowSearch("rate-user", now + 61_000)).toBe(true);
  });
});

describe("GET /api/address-search", () => {
  it("needs a verified session and a configured provider", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
    stubProvider();
    expect((await GET(request("2 Charmouth"))).status).toBe(404);

    const { cookie } = await createVerifiedUser();
    const response = await GET(request("2 Charmouth", cookie));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).suggestions[0]).toMatchObject({ addressLine1: "2 Charmouth Place", state: "VIC" });

    vi.stubEnv("GEOAPIFY_API_KEY", "");
    expect((await GET(request("2 Charmouth", cookie))).status).toBe(404);
  });
});
