import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import type { Role } from "./policy";
import { authenticationEnabled, getAuthentication } from "./runtime";

export const currentAccount = cache(async () => {
  if (!authenticationEnabled()) return null;
  return getAuthentication().principal(await headers());
});

export async function requireRole(role: Role) {
  const context = await currentAccount();
  if (!context) redirect(`/login?next=${role === "ADMIN" ? "/admin" : "/dashboard"}`);
  if (context.user.role !== role) redirect(context.user.role === "ADMIN" ? "/admin" : "/dashboard?notice=forbidden");
  return context;
}
