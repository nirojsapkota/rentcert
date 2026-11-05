"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PhotoFormState } from "./inspection-actions";

export function PhotoUploadForm({ action }: { action: (state: PhotoFormState, formData: FormData) => Promise<PhotoFormState> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "invalid" && <Alert tone="error">{state.message}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="photo" className="block text-sm font-medium">
          Photo
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="photo-hint"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p id="photo-hint" className="text-sm text-ink-muted">
          JPG, PNG or WebP, up to 8 MB.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="caption" className="block text-sm font-medium">
          Caption (optional)
        </label>
        <input id="caption" name="caption" maxLength={200} className="block w-full rounded-md border border-line bg-surface px-3 py-2 text-base" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload photo"}
      </Button>
    </form>
  );
}
