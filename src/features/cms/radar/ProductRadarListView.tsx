import { Link } from "react-router-dom";
import { Button } from "../../../design-system";
import type { ProductRadarRecord } from "../api/cmsClient";
import { DataTable, EmptyState, MobileFeatureCard } from "../components/CmsPrimitives";
import { formatProductRadarUpdatedAt } from "./productRadarForm";

export function ProductRadarListView({
  items,
  loading,
  canManage,
  deletingId,
  onOpen,
  onDelete,
  onCreate,
}: {
  items: ProductRadarRecord[];
  loading: boolean;
  canManage: boolean;
  deletingId: number | null;
  onOpen: (id: number) => void;
  onDelete: (record: ProductRadarRecord) => void;
  onCreate?: () => void;
}) {
  return (
    <DataTable
      columns={["Название", "Обновлён", "Действия"]}
      loading={loading}
      loadingMore={false}
      error={null}
      hasMore={false}
      loadedCount={items.length}
      total={items.length}
      onMore={() => undefined}
      itemNoun="радар"
      empty={
        !loading ? (
          <EmptyState
            title="Ещё нет ни одного радара"
            description="Создайте первый — задайте название и JQL для портфеля задач."
            action={
              canManage && onCreate ? (
                <Button intent="create" onClick={onCreate}>
                  Новый радар
                </Button>
              ) : undefined
            }
          />
        ) : undefined
      }
      mobileCards={items.map((item) => (
        <MobileFeatureCard
          key={item.id}
          title={
            <Link to={`${item.id}`} className="hover:text-blue">
              {item.name}
            </Link>
          }
          subtitle={`Обновлён ${formatProductRadarUpdatedAt(item.updated_at)}`}
          accent="blue"
          metrics={[
            { label: "Задач", value: item.snapshot?.issue_count ?? "—" },
            { label: "Активных", value: item.snapshot?.active_count ?? "—" },
            { label: "Обновлён", value: formatProductRadarUpdatedAt(item.updated_at) },
          ]}
          primaryAction={
            <Button size="sm" intent="open" onClick={() => onOpen(item.id)}>
              Открыть
            </Button>
          }
          secondaryAction={
            canManage ? (
              <Button
                size="sm"
                intent="delete"
                loading={deletingId === item.id}
                disabled={deletingId !== null}
                confirmTitle="Удалить радар?"
                confirmDescription={
                  <span>
                    Радар <b>«{item.name}»</b> будет удалён без возможности восстановить.
                  </span>
                }
                onClick={() => onDelete(item)}
              >
                Удалить
              </Button>
            ) : null
          }
        />
      ))}
    >
      {items.map((item) => (
        <tr key={item.id} className="border-t border-line align-top">
          <td className="px-3 py-2">
            <Link to={`${item.id}`} className="font-semibold text-ink hover:text-blue">
              {item.name}
            </Link>
          </td>
          <td className="px-3 py-2 text-sm text-ink3">{formatProductRadarUpdatedAt(item.updated_at)}</td>
          <td className="px-3 py-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" intent="open" onClick={() => onOpen(item.id)}>
                Открыть
              </Button>
              {canManage ? (
                <Button
                  size="sm"
                  intent="delete"
                  loading={deletingId === item.id}
                  disabled={deletingId !== null}
                  confirmTitle="Удалить радар?"
                  confirmDescription={
                    <span>
                      Радар <b>«{item.name}»</b> будет удалён без возможности восстановить.
                    </span>
                  }
                  onClick={() => onDelete(item)}
                >
                  Удалить
                </Button>
              ) : null}
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
