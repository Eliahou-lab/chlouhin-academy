import { headers } from "next/headers";

export function isAdminAuthorized(secret?: FormDataEntryValue | string | null) {
  const expected = process.env.ADMIN_SECRET;
  const headerSecret = headers().get("x-admin-secret");
  const providedSecret = typeof secret === "string" ? secret : null;

  return Boolean(expected && (headerSecret === expected || providedSecret === expected));
}

export function adminDenied() {
  return { ok: false, error: "Non autorisé" };
}
