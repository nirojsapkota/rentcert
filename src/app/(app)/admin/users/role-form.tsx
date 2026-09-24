"use client";

import { useFormStatus } from "react-dom";
import { setUserRoleAction } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium hover:bg-canvas disabled:opacity-60">
      {pending ? "Saving…" : label}
    </button>
  );
}

// Asks before changing a role, because admins can read every account.
export function RoleForm({ userId, email, isAdmin }: { userId: string; email: string; isAdmin: boolean }) {
  const question = isAdmin ? `Remove admin access from ${email}?` : `Give ${email} admin access? Admins can see every account.`;
  return (
    <form
      action={setUserRoleAction.bind(null, userId)}
      onSubmit={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <input type="hidden" name="role" value={isAdmin ? "USER" : "ADMIN"} />
      <Submit label={isAdmin ? "Remove admin" : "Make admin"} />
    </form>
  );
}
