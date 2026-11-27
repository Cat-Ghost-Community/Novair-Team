export type Role = "ADMIN" | "USER";
export type Principal = { id: string; role: Role; disabledAt: Date | null };

export function hasRole(principal: Principal | null, role: Role): boolean {
  return principal !== null && principal.disabledAt === null && principal.role === role;
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !/^\/(dashboard|admin)(\/|$)/.test(value) ||
    value.includes("\\") || value.includes("%") || value.includes("//") || /(^|\/)\.{1,2}(\/|$)/.test(value) || /[\u0000-\u0020\u007f?#]/.test(value)) return "/dashboard";
  return value;
}
