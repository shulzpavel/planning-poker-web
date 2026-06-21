import { type ButtonHTMLAttributes, type ReactNode, type SVGProps } from "react";
import { cn } from "./utils";

type HeaderMenuButtonIcon = "menu" | "more";

type HeaderMenuButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon?: HeaderMenuButtonIcon;
  children?: ReactNode;
};

const ICONS: Record<HeaderMenuButtonIcon, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  menu: MenuIcon,
  more: MoreIcon,
};

/**
 * Shared compact trigger for header overflow/navigation sheets.
 * It keeps mobile touch targets at 44px while allowing smaller desktop chrome.
 */
export function HeaderMenuButton({
  label,
  icon = "menu",
  children,
  className,
  type = "button",
  ...props
}: HeaderMenuButtonProps) {
  const Icon = ICONS[icon];
  const hasText = Boolean(children);

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold text-ink shadow-sm",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out hover:bg-line2 active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "motion-reduce:active:scale-100 sm:h-9 sm:min-w-9 sm:rounded-lg",
        hasText ? "gap-2 px-3" : "w-11 px-0 sm:w-9",
        className,
      )}
      {...props}
    >
      <Icon className={cn("shrink-0", icon === "more" ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
      {hasText ? <span className="min-w-0 truncate">{children}</span> : null}
    </button>
  );
}

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...props}>
      <path d="M4 6h12" />
      <path d="M4 10h12" />
      <path d="M4 14h12" />
    </svg>
  );
}

function MoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <circle cx="4.5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15.5" cy="10" r="1.5" />
    </svg>
  );
}
