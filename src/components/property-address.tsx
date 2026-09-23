type AddressParts = {
  addressLine1: string;
  addressLine2: string | null;
  suburb: string;
  state: string;
  postcode: string;
};

export function streetLine(property: AddressParts): string {
  return property.addressLine2 ? `${property.addressLine1}, ${property.addressLine2}` : property.addressLine1;
}

export function localityLine(property: AddressParts): string {
  return `${property.suburb} ${property.state} ${property.postcode}`;
}

// Title for lists and headings: the nickname if set, otherwise the street address.
export function propertyTitle(property: AddressParts & { nickname: string | null }): string {
  return property.nickname ?? streetLine(property);
}
