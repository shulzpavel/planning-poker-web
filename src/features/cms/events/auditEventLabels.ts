/**
 * Human-readable Russian labels for CMS audit log actions and payload fields.
 * Action keys are stable API identifiers from voting-service `_audit(...)`.
 */

export const ACTION_LABELS: Record<string, string> = {
  // Auth & preferences
  "cms.login": "Вход в CMS",
  "cms.logout": "Выход из CMS",
  "cms.preferences.update": "Настройки CMS обновлены",

  // Teams
  "cms.team.create": "Команда создана",
  "cms.team.update": "Команда обновлена",

  // Sessions (CMS)
  "cms.session.close": "Сессия закрыта",
  "cms.session.delete": "Сессия удалена",
  "cms.session.rename": "Сессия переименована",

  // Tasks (CMS)
  "cms.task.create": "Задача создана",
  "cms.task.bulk_create": "Задачи добавлены пачкой",
  "cms.task.update": "Задача изменена",
  "cms.task.delete": "Задача удалена",
  "cms.task.move": "Задача перемещена",
  "cms.task.reorder": "Очередь переставлена",
  "cms.task.jira_import": "Импорт из Jira",

  // Tokens
  "cms.token.revoke": "Invite-ссылка отозвана",

  // Access
  "cms.access.role.create": "Создана роль",
  "cms.access.role.update": "Роль обновлена",
  "cms.access.admin.create": "Создан CMS-пользователь",
  "cms.access.admin.update": "CMS-пользователь обновлён",

  // Sprint planner
  "cms.sprint_plan.create": "План спринта создан",
  "cms.sprint_plan.update": "План спринта обновлён",
  "cms.sprint_plan.delete": "План спринта удалён",

  // Standups
  "cms.standup.create": "Дейлик создан",
  "cms.standup.update": "Дейлик обновлён",
  "cms.standup.publish": "Дейлик опубликован",
  "cms.standup.sync_roster": "Состав дейлика синхронизирован",
  "cms.standup.delete": "Дейлик удалён",
  "cms.standup_roster.update": "Состав команды для дейликов обновлён",

  // Scope board
  "cms.scope_board.create": "Отчёт создан",
  "cms.scope_board.update": "Отчёт обновлён",
  "cms.scope_board.delete": "Отчёт удалён",
  "cms.scope_board.refresh": "Отчёт обновлён из Jira",
  "cms.scope_board.layout_update": "Раскладка отчёта изменена",
  "cms.scope_board.flow_pace_chart_order_update": "Порядок диаграмм изменён",
  "cms.scope_board.release_comments_update": "Комментарии к релизу обновлены",
  "cms.scope_board.issue_comment": "Комментарий к задаче",
  "cms.scope_board.report_comment": "Комментарий к отчёту",
  "cms.scope_board.question_create": "Вопрос добавлен",
  "cms.scope_board.question_resolve": "Вопрос закрыт",
  "cms.scope_board.top_item_create": "Топ-пункт добавлен",
  "cms.scope_board.top_item_delete": "Топ-пункт удалён",
  "cms.scope_board.todo_create": "Задача в списке дел добавлена",
  "cms.scope_board.todo_update": "Задача в списке дел обновлена",
  "cms.scope_board.todo_delete": "Задача в списке дел удалена",
  "cms.scope_board.queue_reorder": "Очередь приоритетов переставлена",
  "cms.scope_board.queue_reset_ranked": "Ранжирование очереди сброшено",
  "cms.scope_board.queue_comment": "Комментарий к очереди",
  "cms.scope_board.queue_due_date_update": "Срок в очереди изменён",
  "cms.scope_board.analyze": "AI-анализ отчёта",

  // Retro
  "cms.retro.create": "Ретро создано",
  "cms.retro.update": "Ретро обновлено",
  "cms.retro.delete": "Ретро удалено",
  "cms.retro.invite": "Ссылка на ретро сгенерирована",
  "cms.retro.section.open": "Секция ретро открыта",
  "cms.retro.section.close": "Секция ретро закрыта",
  "cms.retro.phase": "Фаза ретро изменена",
  "cms.retro.group.create": "Группа карточек создана",
  "cms.retro.group.rename": "Группа карточек переименована",
  "cms.retro.group.delete": "Группа карточек удалена",
  "cms.retro.action_item.add": "Action item добавлен",
  "cms.retro.action_item.remove": "Action item удалён",
  "cms.retro.finalize": "Ретро завершено",
  "cms.retro.analyze": "AI-анализ ретро",

  // App sessions
  "app.demo_session": "Демо-сессия",
  "app.session.create": "Сессия создана",
  "app.session.rename": "Сессия переименована",
  "app.session.start": "Старт раунда",
  "app.session.reveal": "Reveal",
  "app.session.next": "Следующая задача",
  "app.session.skip": "Пропуск задачи",
  "app.session.finish": "Сессия завершена",
  "app.session.completed_reopen": "Завершённая задача возвращена в работу",
  "app.session.final_estimate": "Финальная оценка SP",
  "app.session.invite": "Сгенерирована invite-ссылка",
  "app.session.invite_regenerate": "Invite-ссылка пересоздана",
  "app.session.jira_sp_sync": "Story Points синхронизированы с Jira",
  "app.session.summary_export": "Сводка экспортирована",

  // App tasks
  "app.task.create": "Задача создана (в сессии)",
  "app.task.update": "Задача изменена (в сессии)",
  "app.task.delete": "Задача удалена (в сессии)",
  "app.task.move": "Задача перемещена (в сессии)",
  "app.task.reorder": "Очередь переставлена (в сессии)",
  "app.task.jira_import": "Импорт из Jira (в сессии)",
  "app.task.ai_summary.generate": "AI-сводка по задаче",
};

export const PAYLOAD_FIELD_LABELS: Record<string, string> = {
  session_id: "Сессия",
  chat_id: "Сессия",
  task_id: "Задача",
  team_id: "Команда",
  standup_id: "Дейлик",
  retro_id: "Ретро",
  board_id: "Отчёт",
  plan_id: "План спринта",
  role_id: "Роль",
  admin_id: "CMS-пользователь",
  token_id: "Токен",
  group_id: "Группа",
  item_id: "Элемент",
  topic_id: "Тема",
  question_id: "Вопрос",
  section_id: "Секция",
  issue_key: "Задача Jira",
  count: "Количество",
  error: "Ошибка",
  reason: "Причина",
  status: "Статус",
  intake_status: "Статус intake",
  target: "Цель",
  target_index: "Позиция",
  queue: "Очередь",
  source: "Источник",
  cached: "Из кэша",
  format: "Формат",
  rows: "Строк",
  name: "Название",
  title: "Заголовок",
  value: "Значение",
  reset: "Сброс",
  tracks: "Треки",
  updated: "Обновлено",
  failed: "Ошибок",
  skipped_count: "Пропущено",
  completed_count: "Завершено",
  member_count: "Участников",
  meeting_date: "Дата встречи",
  due_date: "Срок",
  cleared_count: "Очищено",
  done: "Готово",
  cards: "Карточек",
  health: "Здоровье",
  significance_failures: "Критичные сбои",
  theme_preference: "Тема оформления",
  username: "Пользователь",
  admin: "Администратор",
};

const PAYLOAD_VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    draft: "черновик",
    published: "опубликован",
    archived: "в архиве",
  },
  reason: {
    invalid_credentials: "неверные учётные данные",
  },
  reset: {
    true: "да",
    false: "нет",
  },
  cached: {
    true: "да",
    false: "нет",
  },
  done: {
    true: "да",
    false: "нет",
  },
};

export function labelForAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function labelForPayloadField(key: string): string {
  return PAYLOAD_FIELD_LABELS[key] ?? key;
}

export function formatAuditPayloadValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") {
    const byField = PAYLOAD_VALUE_LABELS[key];
    if (byField) {
      const mapped = byField[String(value)];
      if (mapped) return mapped;
    }
    return value ? "да" : "нет";
  }
  if (typeof value === "string") {
    const byField = PAYLOAD_VALUE_LABELS[key]?.[value];
    return byField ?? value;
  }
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export interface AuditEntityLink {
  label: string;
  to: string;
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

/**
 * Deep links from audit payload to the CMS entity that was affected.
 */
export function extractAuditEntityLinks(payload: Record<string, unknown> | null): AuditEntityLink[] {
  if (!payload) return [];
  const links: AuditEntityLink[] = [];
  const seen = new Set<string>();
  const push = (link: AuditEntityLink) => {
    const key = `${link.label}::${link.to}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  const sessionId = asId(payload.session_id) ?? asId(payload.chat_id);
  if (sessionId) {
    push({ label: `Открыть сессию ${sessionId}`, to: `/cms/sessions?q=${encodeURIComponent(sessionId)}` });
  }

  const standupId = asId(payload.standup_id);
  if (standupId) {
    push({ label: `Открыть дейлик ${standupId}`, to: `/cms/standups/${encodeURIComponent(standupId)}` });
  }

  const retroId = asId(payload.retro_id);
  if (retroId) {
    push({ label: `Открыть ретро ${retroId}`, to: `/cms/retro/${encodeURIComponent(retroId)}` });
  }

  const boardId = asId(payload.board_id);
  if (boardId) {
    push({ label: `Открыть отчёт ${boardId}`, to: `/cms/scope/${encodeURIComponent(boardId)}` });
  }

  const planId = asId(payload.plan_id);
  if (planId) {
    push({ label: `Открыть план ${planId}`, to: `/cms/planner?q=${encodeURIComponent(planId)}` });
  }

  const username =
    typeof payload.username === "string" && payload.username
      ? payload.username
      : typeof payload.admin === "string" && payload.admin
        ? payload.admin
        : null;
  if (username) {
    push({ label: `Открыть пользователя ${username}`, to: `/cms/access/users?q=${encodeURIComponent(username)}` });
  }

  return links;
}
