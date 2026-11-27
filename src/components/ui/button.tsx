import type { ButtonHTMLAttributes, Ref } from "react";
import { clsx } from "clsx";

export function buttonClass(variant: "primary" | "secondary" | "ghost" = "primary", className?: string) {
  return clsx("button", `button--${variant}`, className);
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  ref?: Ref<HTMLButtonElement>;
}) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
