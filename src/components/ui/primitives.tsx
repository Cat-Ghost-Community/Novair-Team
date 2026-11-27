import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";
import { CircleAlert, LoaderCircle } from "lucide-react";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("container", className)} {...props} />;
}
export function Section({ className, ...props }: ComponentProps<"section">) {
  return <section className={clsx("section", className)} {...props} />;
}
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("card", className)} {...props} />;
}
export function Badge({ children, tone = "lavender" }: { children: ReactNode; tone?: "lavender" | "mint" | "coral" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
export function Lead({ className, ...props }: ComponentProps<"p">) {
  return <p className={clsx("lead", className)} {...props} />;
}
export function TechnicalValue({ children }: { children: ReactNode }) {
  return <bdi dir="ltr" className="technical-value">{children}</bdi>;
}
export function LoadingIndicator({ label = "در حال بارگذاری" }: { label?: string }) {
  return <span role="status" className="loading-indicator"><LoaderCircle aria-hidden="true" className="spin" size={20} />{label}</span>;
}
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Card className="empty-state"><h1>{title}</h1><p className="muted">{children}</p>{action}</Card>;
}
export function ErrorFeedback({ children }: { children: ReactNode }) {
  return <div className="error-feedback" role="alert"><CircleAlert aria-hidden="true" size={20} /><p>{children}</p></div>;
}
