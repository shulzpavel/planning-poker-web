import { useEffect } from "react";
import { cn } from "./utils";

const MAINTENANCE_SUBTITLE_DESKTOP =
  "Пока идут работы, лучше не голосовать и не обновлять страницу — несохранённые данные могут потеряться";

function MaintenanceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M10 6.25v4.25M10 13.75h.008"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MaintenanceBanner({ className }: { className?: string }) {
  useEffect(() => {
    document.documentElement.classList.add("has-maintenance-banner");
    return () => {
      document.documentElement.classList.remove("has-maintenance-banner");
    };
  }, []);

  return (
    <aside
      className={cn(
        "maintenance-banner sticky top-0 z-[60] w-full shrink-0 pt-safe",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Технические работы. ${MAINTENANCE_SUBTITLE_DESKTOP}`}
    >
      <div className="maintenance-banner-accent h-[3px] w-full shrink-0" aria-hidden="true" />
      <div
        className={cn(
          "relative flex w-full items-center justify-center border-b border-line bg-surface px-4 text-center",
          "min-h-[10dvh] min-h-[10svh]",
        )}
      >
        <div
          className={cn(
            "flex w-full max-w-3xl flex-col items-center gap-2.5 py-3",
            "sm:gap-3 sm:py-4",
            "lg:flex-row lg:items-center lg:gap-4 lg:text-left",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-line2 text-red sm:h-11 sm:w-11 lg:h-12 lg:w-12">
            <MaintenanceIcon />
          </div>
          <div className="min-w-0 max-w-xl lg:max-w-none">
            <p className="text-balance text-[0.9375rem] font-semibold leading-tight tracking-[-0.02em] text-red sm:text-base">
              Идут технические работы
            </p>

            <div className="mt-1 space-y-0.5 lg:hidden">
              <p className="text-balance text-sm leading-snug text-ink2">
                Не голосуйте и не обновляйте страницу.
              </p>
              <p className="text-balance text-sm leading-snug text-ink3">
                Несохранённые данные могут потеряться.
              </p>
            </div>

            <p className="mt-0.5 hidden text-balance text-sm leading-snug text-ink3 lg:block lg:max-w-2xl lg:text-[0.9375rem]">
              {MAINTENANCE_SUBTITLE_DESKTOP}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
