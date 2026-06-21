import { useState, type SVGProps } from "react";
import { BottomSheet } from "./BottomSheet";
import { ThemeMenuControl } from "./ThemeMenuControl";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme, type ThemeMode } from "./theme";
import { cn } from "./utils";

type ThemeHeaderControlProps = {
  className?: string;
};

const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Светлая тема",
  system: "Системная тема",
  dark: "Тёмная тема",
};

const MODE_ICONS: Record<ThemeMode, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  light: SunIcon,
  system: SystemIcon,
  dark: MoonIcon,
};

/**
 * Header-safe theme switcher. Mobile headers get a single 44px action that
 * opens the shared bottom-sheet theme control; wider headers keep the full
 * segmented toggle.
 */
export function ThemeHeaderControl({ className }: ThemeHeaderControlProps) {
  const [open, setOpen] = useState(false);
  const { mode } = useTheme();
  const Icon = MODE_ICONS[mode];
  const label = MODE_LABELS[mode];

  return (
    <>
      <button
        type="button"
        aria-label={`Открыть выбор темы. Сейчас: ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Тема"
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface/85 text-ink shadow-card",
          "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out hover:bg-line2 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "sm:hidden",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </button>
      <ThemeToggle className={cn("hidden sm:inline-flex", className)} />
      <BottomSheet
        open={open}
        title="Оформление"
        description="Выберите режим отображения для всех экранов."
        onClose={() => setOpen(false)}
      >
        <div className="pb-2">
          <ThemeMenuControl />
        </div>
      </BottomSheet>
    </>
  );
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" />
    </svg>
  );
}

function SystemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16.5V20" />
    </svg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.5 14.5A8 8 0 1 1 9.5 3.5a6.5 6.5 0 0 0 11 11Z" />
    </svg>
  );
}
