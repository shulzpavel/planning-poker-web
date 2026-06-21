interface TeamGroupHeadingProps {
  label: string;
  count: number;
}

export function TeamGroupHeading({ label, count }: TeamGroupHeadingProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line pb-2 lg:items-baseline lg:justify-start">
      <h3 className="min-w-0 text-base font-bold text-ink lg:text-sm">{label}</h3>
      <span className="rounded-full bg-line2 px-2 py-1 text-xs font-semibold text-ink3 tabular-nums lg:bg-transparent lg:px-0 lg:py-0 lg:font-normal">
        {count} {count === 1 ? "запись" : count < 5 ? "записи" : "записей"}
      </span>
    </div>
  );
}
