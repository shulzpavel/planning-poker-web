interface TeamGroupHeadingProps {
  label: string;
  count: number;
}

export function TeamGroupHeading({ label, count }: TeamGroupHeadingProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-line pb-2">
      <h3 className="text-sm font-bold text-ink">{label}</h3>
      <span className="text-xs text-ink3 tabular-nums">
        {count} {count === 1 ? "запись" : count < 5 ? "записи" : "записей"}
      </span>
    </div>
  );
}
