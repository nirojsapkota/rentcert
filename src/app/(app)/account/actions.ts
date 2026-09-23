"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/account-validation";
import { updateProfile } from "@/server/account";
import { requireUser } from "@/server/session";

export type ProfileFormState = {
  status: "idle" | "saved" | "invalid";
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "timezone" | "notificationEmail" | "reminderEmailsEnabled", string>>;
};

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    timezone: formData.get("timezone") ?? "",
    notificationEmail: formData.get("notificationEmail") ?? "",
    reminderEmailsEnabled: formData.get("reminderEmailsEnabled"),
  });
  if (!parsed.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "invalid", fieldErrors };
  }

  await updateProfile(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { status: "saved" };
}
