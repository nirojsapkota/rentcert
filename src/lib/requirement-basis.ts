// Plain-language line explaining where a check's timing comes from. Shared by the property page and
// the Compliance Pack. Never says a property is compliant.
export type RequirementBasis = "REQUIRED_INTERVAL" | "BEFORE_EACH_TENANCY" | "RECOMMENDED";

const GENERIC = "GENERIC";

function every(months: number) {
  if (months % 12 === 0) return months === 12 ? "every year" : `every ${months / 12} years`;
  return months === 1 ? "every month" : `every ${months} months`;
}

export function basisLine(basis: RequirementBasis, jurisdiction: string, recurrenceMonths: number): string {
  if (jurisdiction === GENERIC) return `General schedule: reminders ${every(recurrenceMonths)}.`;
  switch (basis) {
    case "REQUIRED_INTERVAL":
      return `Required ${every(recurrenceMonths)} in ${jurisdiction}.`;
    case "BEFORE_EACH_TENANCY":
      return `Required before each new or renewed tenancy in ${jurisdiction}. RentCert reminds you ${every(recurrenceMonths)}.`;
    case "RECOMMENDED":
      return `Recommended ${every(recurrenceMonths)}. Not a fixed legal interval in ${jurisdiction}.`;
  }
}

export const BASIS_OPTIONS: { value: RequirementBasis; label: string }[] = [
  { value: "REQUIRED_INTERVAL", label: "Required interval" },
  { value: "BEFORE_EACH_TENANCY", label: "Before each tenancy" },
  { value: "RECOMMENDED", label: "Recommended" },
];
