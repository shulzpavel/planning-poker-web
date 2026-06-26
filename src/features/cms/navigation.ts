import type { CmsPrincipal, TabKey } from "./api/cmsTypes";

export const CMS_PERMISSIONS = {
  overview: "cms.overview.view",
  sessions: "cms.sessions.view",
  users: "cms.users.view",
  events: "cms.events.view",
  access: "cms.access.view",
  accessManage: "cms.access.manage",
  tasksManage: "cms.tasks.manage",
  appSessionsManage: "app.sessions.manage",
  webParticipantsDelete: "cms.web_participants.delete",
  planner: "cms.planner.view",
  retro: "cms.retro.view",
  retroManage: "cms.retro.manage",
  retroAnalyze: "cms.retro.analyze",
  standups: "cms.standups.view",
  standupsManage: "cms.standups.manage",
} as const;

/**
 * Logical groups for the CMS nav menu. Groups render in declaration order;
 * empty groups are omitted per principal. Labels are optional — when omitted,
 * sections are separated visually (divider) instead of a heading.
 */
export type CmsNavGroupKey = "overview" | "workflow" | "coordination" | "admin";

export interface CmsNavGroup {
  key: CmsNavGroupKey;
  label?: string;
}

export const cmsNavGroups: CmsNavGroup[] = [
  { key: "overview" },
  { key: "workflow" },
  { key: "coordination" },
  { key: "admin" },
];

export interface CmsTab {
  key: TabKey;
  label: string;
  description: string;
  permission: string;
  path: string;
  routePath: string;
  group: CmsNavGroupKey;
}

// "votes" and "web" came from the Telegram bot era and are intentionally
// excluded from navigation. The backend disables their CMS page rows on
// startup; we keep TabKey wide enough for older principal payloads but the
// list below is the single source of truth for what's actually rendered.
export const cmsTabs: CmsTab[] = [
  {
    key: "overview",
    label: "Сводка",
    description: "Ключевые цифры по сессиям, участникам и активности.",
    permission: CMS_PERMISSIONS.overview,
    path: "/cms",
    routePath: "",
    group: "overview",
  },
  {
    key: "planner",
    label: "Калькулятор",
    description: "Velocity и Capacity на следующий спринт: задаём команду и историю — получаем рекомендацию в SP.",
    permission: CMS_PERMISSIONS.planner,
    path: "/cms/planner",
    routePath: "planner",
    group: "workflow",
  },
  {
    key: "sessions",
    label: "Сессии",
    description: "Список планирований: открыть управление, отчёт, закрыть или удалить из истории.",
    permission: CMS_PERMISSIONS.sessions,
    path: "/cms/sessions",
    routePath: "sessions",
    group: "workflow",
  },
  {
    key: "scope",
    label: "Отчеты",
    description: "Месячные отчёты по командам: capacity, статус задач, открытые вопросы и AI-сводка для бизнеса.",
    permission: CMS_PERMISSIONS.planner,
    path: "/cms/scope",
    routePath: "scope",
    group: "workflow",
  },
  {
    key: "retro",
    label: "Ретроспективы",
    description: "Живое ретро: настраиваем секции, команда подключается по ссылке, в конце — AI-анализ итогов.",
    permission: CMS_PERMISSIONS.retro,
    path: "/cms/retro",
    routePath: "retro",
    group: "workflow",
  },
  {
    key: "standups",
    label: "Дейлики",
    description: "Ежедневные standup-записи по командам: вчера, сегодня, блокеры и сроки задач.",
    permission: CMS_PERMISSIONS.standups,
    path: "/cms/standups",
    routePath: "standups",
    group: "coordination",
  },
  {
    key: "radar",
    label: "Радар",
    description: "Продуктовая нагрузка: кто загружен, кто простаивает, автоматические сигналы по Jira.",
    permission: CMS_PERMISSIONS.planner,
    path: "/cms/radar",
    routePath: "radar",
    group: "coordination",
  },
  {
    key: "users",
    label: "Участники",
    description: "Кто заходил в сессии. Используется для поиска по имени и роли.",
    permission: CMS_PERMISSIONS.users,
    path: "/cms/users",
    routePath: "users",
    group: "admin",
  },
  {
    key: "events",
    label: "Журнал действий",
    description: "Аудит-лог: кто, когда и что менял в CMS и сессиях.",
    permission: CMS_PERMISSIONS.events,
    path: "/cms/events",
    routePath: "events",
    group: "admin",
  },
  {
    key: "access",
    label: "Доступы",
    description: "CMS-пользователи, роли и права. Системные роли защищены от изменений.",
    permission: CMS_PERMISSIONS.access,
    path: "/cms/access",
    routePath: "access",
    group: "admin",
  },
];

export function hasPermission(principal: CmsPrincipal, permission: string): boolean {
  return principal.is_superuser || principal.permissions.includes(permission);
}

export function visibleCmsTabs(principal: CmsPrincipal): CmsTab[] {
  const tabByKey = new Map<TabKey, CmsTab>(cmsTabs.map((tab) => [tab.key, tab]));
  const orderedFromDb = principal.pages
    .map((page) => tabByKey.get(page.key as TabKey))
    .filter((tab): tab is CmsTab => Boolean(tab))
    .filter((tab) => hasPermission(principal, tab.permission));

  if (orderedFromDb.length > 0) {
    const included = new Set(orderedFromDb.map((tab) => tab.key));
    const missingPermittedTabs = cmsTabs.filter((tab) => !included.has(tab.key) && hasPermission(principal, tab.permission));
    return [...orderedFromDb, ...missingPermittedTabs];
  }
  return cmsTabs.filter((tab) => hasPermission(principal, tab.permission));
}

/**
 * Group the principal's visible tabs by `cmsNavGroups`, preserving the order
 * of `cmsTabs` inside each group and dropping any group that has no items.
 *
 * Used by the mobile drawer in `CmsShell` to render a hierarchical menu. The
 * desktop tab bar still uses the flat `visibleCmsTabs` list.
 */
/**
 * Stable transition key for CMS route animations. Nested paths such as
 * `/cms/scope/42` or `/cms/planner/new` share the parent section key so
 * `RouteTransition` does not remount the whole CMS shell (and lazy feature
 * bundles like ScopeBoardShell) on every in-section navigation.
 */
export function resolveCmsSectionKey(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/cms";
  if (normalized === "/cms" || normalized === "/cms/overview") {
    return "/cms";
  }
  if (!normalized.startsWith("/cms/")) {
    return normalized;
  }

  const segments = normalized.split("/").filter(Boolean);
  const section = segments[1];
  if (!section) return "/cms";
  if (section === "access") return "/cms/access";
  return `/cms/${section}`;
}

/** App-level transition key — keeps `CmsPage` mounted across nested CMS URLs. */
export function resolveAppTransitionKey(pathname: string): string {
  if (pathname.startsWith("/cms")) {
    return resolveCmsSectionKey(pathname);
  }
  return pathname;
}

export function groupVisibleTabs(
  principal: CmsPrincipal,
): { group: CmsNavGroup; items: CmsTab[] }[] {
  const visibleKeys = new Set(visibleCmsTabs(principal).map((tab) => tab.key));
  const result: { group: CmsNavGroup; items: CmsTab[] }[] = [];
  for (const group of cmsNavGroups) {
    const items = cmsTabs.filter((tab) => tab.group === group.key && visibleKeys.has(tab.key));
    if (items.length > 0) {
      result.push({ group, items });
    }
  }
  return result;
}
