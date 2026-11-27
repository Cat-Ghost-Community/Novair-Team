// Only destinations rendered in the current landing page belong in public navigation.
export const publicNavigation = [
  { href: "/#capabilities", label: "توانایی‌ها" },
  { href: "/#work", label: "نمونه‌کارها" },
  { href: "/#process", label: "همکاری" },
  { href: "/#faq", label: "پرسش‌ها" },
] as const;

export const projectAccess = {
  href: "/dashboard/requests/new",
  label: "شروع پروژه",
  notice: "درخواستت را در حساب کاربری ثبت و پیگیری کن؛ ثبت درخواست به معنی پذیرش پروژه نیست.",
} as const;
