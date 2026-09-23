"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { UploadFormState } from "./document-actions";

export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function UploadForm({ action }: { action: (state: UploadFormState, formData: FormData) => Promise<UploadFormState> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="document" className="block text-sm font-medium">
          Certificate or report
        </label>
        <input
          id="document"
          name="document"
          type="file"
          accept={DOCUMENT_ACCEPT}
          aria-describedby="document-hint"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p id="document-hint" className="text-sm text-ink-muted">
          PDF, JPG or PNG, up to 10 MB.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}
