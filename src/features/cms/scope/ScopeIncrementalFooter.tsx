import { LoadMoreFooter } from "../components/CmsPrimitives";
import { LIST_PAGE_SIZE } from "../../../shared/listPaging";

export function ScopeIncrementalFooter({
  loadedCount,
  total,
  hasMore,
  onMore,
  itemNoun = "задач",
}: {
  loadedCount: number;
  total: number;
  hasMore: boolean;
  onMore: () => void;
  itemNoun?: string;
}) {
  if (total <= LIST_PAGE_SIZE) {
    return null;
  }

  return (
    <LoadMoreFooter
      loading={false}
      hasMore={hasMore}
      loadedCount={loadedCount}
      total={total}
      onMore={onMore}
      itemNoun={itemNoun}
      variant="compact"
    />
  );
}
