import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export type QueryParams<TFilter = unknown, TSort extends string = string> = {
  page: number; // zero-based
  pageSize: number;
  search?: string;
  sortBy?: TSort;
  sortDir?: SortDir;
  filters?: TFilter;
};

export type PageInfoCursor = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
};

export type PageResult<T> = {
  rows: T[];
  total: number; // Total filtered count (required for DataGrid rowCount)
  pageInfo?: PageInfoCursor; // Optional: useful for GraphQL cursor-based APIs
};

export type Fetcher<T, TFilter = unknown, TSort extends string = string> = (
  params: QueryParams<TFilter, TSort>
) => Promise<PageResult<T>>;

export type ColumnDef<T> = {
  key: keyof T | string; // can be a computed/virtual field
  header: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  // Accessors and renderers
  getValue?: (row: T) => unknown;
  render?: (row: T, value: unknown) => ReactNode;
  valueFormatter?: (value: unknown, row: T) => string;
};
