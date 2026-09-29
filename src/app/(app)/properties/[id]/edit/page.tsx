import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { propertyTitle } from "@/components/property-address";
import { toCalendarDateString } from "@/lib/calendar-date";
import { addressLookupEnabled } from "@/server/address/search";
import { findOwnedProperty } from "@/server/properties/queries";
import { requireUser } from "@/server/session";
import { updatePropertyAction } from "../../actions";
import { PropertyForm } from "../../property-form";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: PageProps<"/properties/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();
  const property = await findOwnedProperty(user.id, id);
  if (!property) notFound();

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-bold text-deep">Edit {propertyTitle(property)}</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <PropertyForm
          action={updatePropertyAction.bind(null, property.id)}
          initialValues={{
            addressLine1: property.addressLine1,
            addressLine2: property.addressLine2 ?? "",
            suburb: property.suburb,
            state: property.state,
            postcode: property.postcode,
            nickname: property.nickname ?? "",
            notes: property.notes ?? "",
            leaseStartDate: property.leaseStartDate ? toCalendarDateString(property.leaseStartDate) : "",
          }}
          submitLabel="Save changes"
          cancelHref={`/properties/${property.id}`}
          addressLookup={addressLookupEnabled()}
        />
      </div>
    </section>
  );
}
