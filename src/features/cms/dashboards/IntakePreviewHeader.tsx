import { Link } from "react-router-dom";
import { AutoHideAppHeader, Badge, BrandHomeLink, SubnavBar, ThemeToggle } from "../../../design-system";
import { cmsTabs } from "../navigation";

const stages = [
  { key: "intake", label: "1. Business Backlog", path: "/prototype/dashboards/intake" },
  { key: "discovery", label: "2. Исследование", path: "/prototype/dashboards/discovery" },
  { key: "solution", label: "3. Проработка решения" },
  { key: "planning", label: "4. Планирование" },
  { key: "delivery", label: "5. Delivery" },
] as const;

export function IntakePreviewHeader({ active = "intake" }: { active?: "intake" | "discovery" }) {
  const items = cmsTabs.filter(tab => ["overview", "planner", "sessions", "scope", "retro"].includes(tab.key));
  return <header className="z-30 md:sticky md:top-[var(--maintenance-banner-offset,0px)] md:border-b md:border-line md:bg-surface/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-surface/80">
    <AutoHideAppHeader className="border-b-0" hideOnMobileScroll={false}>
      <div className="flex min-h-16 w-full items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <BrandHomeLink size="sm" showWordmark={false} className="shrink-0"/>
        <div className="min-w-0 flex-1"><p className="text-base font-bold leading-snug text-ink md:text-lg">Planning Poker · Админка</p>
          <p className="mt-0.5 text-xs text-ink3">Личный прототип · Дэшборды</p></div>
        <Badge tone="warning">Тест</Badge><ThemeToggle/>
      </div>
    </AutoHideAppHeader>
    <SubnavBar aria-label="Основное меню CMS" className="overflow-x-auto border-t" innerClassName="mx-auto min-w-max justify-center">
      {items.map(tab=><Link key={tab.key} to={tab.path} className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-ink3 hover:text-ink">{tab.label}</Link>)}
      <Link to="/prototype/dashboards" aria-current="page" className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-blue px-3 py-2 text-sm font-semibold text-blue">Дэшборды</Link>
    </SubnavBar>
    <SubnavBar aria-label="Стадии дэшбордов" className="overflow-x-auto border-t" innerClassName="mx-auto min-w-max justify-center">
      {stages.map(stage => "path" in stage ? <Link key={stage.key} to={stage.path} aria-current={active === stage.key ? "page" : undefined} className={`inline-flex items-center justify-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${active === stage.key ? "border-blue text-blue" : "border-transparent text-ink3 hover:text-ink"}`}>{stage.label}</Link> : <span key={stage.key} className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-ink3/60">{stage.label}</span>)}
    </SubnavBar>
  </header>;
}
