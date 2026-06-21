import { ThemeToggle } from "./ThemeToggle";
import { useTheme, type ThemeMode } from "./theme";
import { cn } from "./utils";

type ThemeMenuControlProps = {
  className?: string;
};

const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Светлая",
  system: "Системная",
  dark: "Тёмная",
};

/**
 * One visual pattern for theme switching inside mobile menus and bottom sheets.
 * Keep labels, spacing and the toggle variant here so all mobile menus change
 * together when the design-system treatment changes.
 */
export function ThemeMenuControl({ className }: ThemeMenuControlProps) {
  const { mode } = useTheme();

  return (
    <div className={cn("px-3 py-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink">Тема интерфейса</p>
          <p className="mt-0.5 text-xs leading-snug text-ink3">{MODE_LABELS[mode]}</p>
        </div>
        <ThemeToggle className="shrink-0" tone="soft" showTooltips={false} />
      </div>
    </div>
  );
}
