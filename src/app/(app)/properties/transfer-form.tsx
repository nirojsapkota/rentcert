"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Transferring…" : "Transfer"}
    </Button>
  );
}

export function TransferForm({
  action,
  propertyTitle,
  people,
}: {
  action: (formData: FormData) => void | Promise<void>;
  propertyTitle: string;
  people: { id: string; name: string }[];
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const select = event.currentTarget.elements.namedItem("newOwnerId") as HTMLSelectElement;
        const name = select.selectedOptions[0]?.text ?? "them";
        if (!window.confirm(`Transfer ${propertyTitle} to ${name}? You will lose access unless they share with you.`)) event.preventDefault();
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="space-y-1.5">
        <label htmlFor="newOwnerId" className="block text-sm font-medium">
          New owner
        </label>
        <select id="newOwnerId" name="newOwnerId" required className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base">
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <Submit />
    </form>
  );
}
