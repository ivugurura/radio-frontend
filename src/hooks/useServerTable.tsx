import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Fetcher,
  PageResult,
  QueryParams,
  SortDir,
} from '@appTypes/table';

type UseServerTableOptions<T, TFilter, TSort extends string> = {
  fetcher: Fetcher<T, TFilter, TSort>;
  initial?: Partial<
    Pick<
      QueryParams<TFilter, TSort>,
      'page' | 'pageSize' | 'search' | 'sortBy' | 'sortDir' | 'filters'
    >
  >;
  debounceMs?: number;
};

export function useServerTable<
  T,
  TFilter = unknown,
  TSort extends string = string,
>(options: UseServerTableOptions<T, TFilter, TSort>) {
  const {
    fetcher,
    initial = { page: 0, pageSize: 10, search: '', sortDir: 'asc' as SortDir },
    debounceMs = 350,
  } = options;

  const [page, setPage] = useState(initial.page ?? 0);
  const [pageSize, setPageSize] = useState(initial.pageSize ?? 10);
  const [search, setSearch] = useState(initial.search ?? '');
  const [sortBy, setSortBy] = useState<TSort | undefined>(initial.sortBy);
  const [sortDir, setSortDir] = useState<SortDir | undefined>(
    initial.sortDir ?? 'asc'
  );
  const [filters, setFilters] = useState<TFilter | undefined>(initial.filters);

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  // Debounce search
  const debounceTimer = useRef<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(
      () => setDebouncedSearch(search),
      debounceMs
    );
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [search, debounceMs]);

  const params: QueryParams<TFilter, TSort> = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      sortBy,
      sortDir,
      filters,
    }),
    [page, pageSize, debouncedSearch, sortBy, sortDir, filters]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: PageResult<T> = await fetcher(params);
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [fetcher, params]);

  // Fetch on dependency change
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, sortBy, sortDir, filters]);

  // Reset selection if data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [rows]);

  const setSort = useCallback((by?: TSort, dir?: SortDir) => {
    setSortBy(by);
    setSortDir(dir);
  }, []);

  return {
    // Data
    rows,
    total,
    loading,
    error,

    // Query state
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
    filters,

    // Setters and handlers
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    setSort,
    refresh,

    // Selection for multi-delete
    selectedIds,
    setSelectedIds,
  };
}
