import type { ReactNode } from "react";
import { Button } from "../../../design-system";

export function ScopeBoardHeader({
  title,
  meta,
  onBack,
  toolbar,
}: {
  title: ReactNode;
  meta?: ReactNode;
  onBack: () => void;
  toolbar?: ReactNode;
}) {
  return (
    <header className="scope-board-header scope-no-print min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Button className="-ml-2 shrink-0" size="sm" variant="ghost" onClick={onBack}>
          Назад
        </Button>
        {toolbar ? (
          <div className="scope-board-header__toolbar flex min-w-0 shrink-0 items-center gap-1.5 overflow-x-auto sm:gap-2">
            {toolbar}
          </div>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">
        <h1 className="text-lg font-bold leading-tight text-ink sm:text-xl">{title}</h1>
        {meta ? <div className="scope-board-header__meta mt-1.5 min-w-0 text-sm text-ink3">{meta}</div> : null}
      </div>
    </header>
  );
}

export function ScopeBoardMetaSeparator() {
  return <span aria-hidden="true" className="text-ink4/80">·</span>;
}
