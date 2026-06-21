import type { ReactNode } from "react";
import { BackButton } from "../../../design-system";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackButton className="-ml-2 self-start sm:shrink-0" label="Назад" size="sm" onClick={onBack} />
        {toolbar ? (
          <div className="scope-board-header__toolbar -mx-1 flex w-full min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:shrink-0 sm:pb-0 [&>*]:shrink-0">
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
