import type { Metadata } from "next";
import { AccountAccessState } from "@/components/auth/access-state";
import { AccountPage } from "@/components/auth/account-page";
import { authenticationEnabled } from "@/server/auth/runtime";
import { currentAccount } from "@/server/auth/guards";
import { accountDestination } from "@/server/auth/service";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/server/auth/policy";

export const metadata: Metadata = { title: "ثبت‌نام" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!authenticationEnabled()) return <AccountAccessState mode="register" />;
  const context = await currentAccount();
  const query = await searchParams;
  if (context) redirect(accountDestination(context.user.role, query.next));
  return <AccountPage mode="register" next={safeReturnPath(query.next)} />;
}
