import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-black",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-brand-soft",
  danger: "bg-danger text-white hover:bg-[#931c13]",
};

export function buttonClasses(variant: Variant = "primary") {
  return `inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
