"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui/button";

function Submit({ label, variant }: { label: string; variant: "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClasses(variant)} px-3 py-1.5`}>
      {pending ? "Working…" : label}
    </button>
  );
}

// A one-button form that asks before it submits. Hidden fields go in children.
export function ConfirmForm({
  action,
  question,
  label,
  variant = "secondary",
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  question: string;
  label: string;
  variant?: "secondary" | "danger";
  children?: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      {children}
      <Submit label={label} variant={variant} />
    </form>
  );
}
