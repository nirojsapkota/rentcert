// Requirement sets, in the order Admin lists them. GENERIC is the fallback for a state with no
// active requirements.
export const JURISDICTIONS = ["VIC", "NSW", "QLD", "SA", "WA", "TAS", "ACT", "NT", "GENERIC"] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number];
