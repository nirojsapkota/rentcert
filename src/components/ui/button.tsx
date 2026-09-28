import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-brand hover:border-brand/40 hover:bg-brand-soft",
  danger: "bg-danger text-white hover:opacity-90",
};

export function buttonClasses(variant: Variant = "primary") {
  return `inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
