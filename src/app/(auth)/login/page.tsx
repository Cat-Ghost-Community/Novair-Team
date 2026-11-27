import type { Metadata } from "next";
import { AccountAccessState } from "@/components/auth/access-state";
import { AccountPage } from "@/components/auth/account-page";
import { authenticationEnabled } from "@/server/auth/runtime";
import { currentAccount } from "@/server/auth/guards";
import { accountDestination } from "@/server/auth/service";
import { safeReturnPath } from "@/server/auth/policy";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "ورود" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; reauth?: string }> }) {
  if (!authenticationEnabled()) return <AccountAccessState mode="login" />;
  const query = await searchParams;
  const context = await currentAccount();
  if (context && query.reauth !== "1") redirect(accountDestination(context.user.role, query.next));
  const notice = query.notice === "signed-out" ? "از حساب خارج شدی."
    : query.notice === "expired" ? "برای ادامه دوباره وارد حساب شوید."
    : query.reauth === "1" ? "برای انجام تغییر حساس، دوباره هویتت را تأیید کن." : undefined;
  return <AccountPage mode="login" next={safeReturnPath(query.next)} notice={notice} />;
}
