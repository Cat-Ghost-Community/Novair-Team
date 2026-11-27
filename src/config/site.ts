import { resolveSiteProfile } from "./site-profile";

export const site = {
  name: "نوایر",
  title: "نوایر | طراحی وب‌سایت و توسعهٔ نرم‌افزار",
  description: "استودیوی دونفرهٔ نوایر؛ طراحی و توسعهٔ وب‌سایت، وب‌اپلیکیشن، داشبورد، ربات و اتوماسیون با دقت و خلاقیت.",
  ...resolveSiteProfile(process.env),
};
