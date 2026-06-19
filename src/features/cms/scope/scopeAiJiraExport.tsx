import { Badge } from "../../../design-system";
import { cmsScopeApi } from "../api/cmsClient";
import type { ScopeAiSummary } from "./scopeAiTypes";

const JIRA_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

export function normalizePlanEpicKey(value: string | null | undefined): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  return JIRA_KEY_RE.test(raw) ? raw : "";
}

export async function pollScopeAiJiraExport(
  boardId: number,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<ScopeAiSummary["jira_export"] | null> {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const payload = await cmsScopeApi.getAiJiraExportStatus(boardId);
    const status = payload.jira_export?.status;
    if (status === "ok" || status === "error") {
      return payload.jira_export ?? null;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

export function ScopeAiJiraExportBadge({
  planEpicKey,
  jiraExport,
  pending = false,
}: {
  planEpicKey?: string | null;
  jiraExport?: ScopeAiSummary["jira_export"];
  pending?: boolean;
}) {
  const epicKey = normalizePlanEpicKey(planEpicKey);
  if (!epicKey) return null;

  if (pending) {
    return <Badge tone="neutral">Отправляем в Jira…</Badge>;
  }

  if (jiraExport?.status === "ok") {
    return (
      <span title={epicKey}>
        <Badge tone="success">Сохранено в Jira</Badge>
      </span>
    );
  }

  if (jiraExport?.status === "error") {
    const errorTitle = jiraExport.error ?? "Не удалось сохранить комментарий в Jira";
    return (
      <span title={errorTitle}>
        <Badge tone="danger">Ошибка Jira</Badge>
      </span>
    );
  }

  return (
    <span title={`Эпик ${epicKey}`}>
      <Badge tone="warning">Jira: ожидание</Badge>
    </span>
  );
}
