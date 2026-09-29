// An address suggestion as the property form uses it. Shared by the search route and the browser.
export type AddressSuggestion = {
  label: string;
  addressLine1: string;
  suburb: string;
  state: string; // an Australian state code, or "" when the provider did not give one
  postcode: string;
};

export const ADDRESS_QUERY_MIN = 4;
export const ADDRESS_QUERY_MAX = 120;
