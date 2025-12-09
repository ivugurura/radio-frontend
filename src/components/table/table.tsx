import * as React from 'react';
import { useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  useTheme,
} from '@mui/material';
import type {
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import { DataGrid, Toolbar as GridToolbarContainer } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import type { ColumnDef, SortDir } from '@appTypes/table';

export type ServerTableProps<T> = {
  // Data and identity
  rows: T[];
  getRowId: (row: T) => string | number;

  // Columns
  columns: ColumnDef<T>[];

  // Server-side pagination/sorting
  loading?: boolean;
  rowCount: number;
  page: number; // zero-based
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  sortBy?: string;
  sortDir?: SortDir;
  onSortChange?: (sortBy?: string, sortDir?: SortDir) => void;

  // Optional actions and states
  enableSelection?: boolean;
  selectedIds?: Set<GridRowId>;
  onSelectionChange?: (ids: GridRowSelectionModel) => void;

  onRefresh?: () => void;
  onDeleteSelected?: (ids: Array<string | number>) => void;

  // Search in toolbar (server-side)
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Optional primary action in table toolbar (if you also want Add here; otherwise use PageHeader)
  onAddClick?: () => void;
  addLabel?: string;

  // Styling
  height?: number | string;
  colorScheme?: 'rainbow' | 'brand' | 'zebra';
};

function Toolbar<T>(props: {
  enableSelection?: boolean;
  selectedCount: number;
  onDeleteSelected?: (ids: Set<GridRowId>) => void;
  onRefresh?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAddClick?: () => void;
  addLabel?: string;
}) {
  const {
    enableSelection,
    selectedCount,
    onDeleteSelected,
    onRefresh,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    onAddClick,
    addLabel = 'Add',
  } = props;

  return (
    <GridToolbarContainer>
      <Box sx={{ p: 1, gap: 1, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {typeof onAddClick === 'function' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddClick}
              sx={{ textTransform: 'none' }}
            >
              {addLabel}
            </Button>
          )}
          {typeof onRefresh === 'function' && (
            <Tooltip title="Refresh">
              <IconButton color="primary" onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          {enableSelection &&
            typeof onDeleteSelected === 'function' &&
            selectedCount > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onDeleteSelected(selectedIds)}
                sx={{ textTransform: 'none' }}
              >
                Delete ({selectedCount})
              </Button>
            )}
        </Stack>
        <Box>
          {typeof onSearchChange === 'function' && (
            <TextField
              size="small"
              placeholder={searchPlaceholder ?? 'Search'}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          )}
        </Box>
      </Box>
    </GridToolbarContainer>
  );
}

export function ServerTable<T>(props: ServerTableProps<T>) {
  const theme = useTheme();
  const {
    rows,
    getRowId,
    columns,
    loading = false,
    rowCount,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    sortBy,
    sortDir,
    onSortChange,
    enableSelection = false,
    selectedIds,
    onSelectionChange,
    onRefresh,
    onDeleteSelected,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    onAddClick,
    addLabel,
    height = 560,
    colorScheme = 'rainbow',
  } = props;

  const gridCols = useMemo<GridColDef[]>(
    () =>
      columns.map((col) => {
        const field = String(col.key);
        const colDef: GridColDef = {
          field,
          headerName: col.header,
          sortable: col.sortable ?? true,
          width: col.width,
          minWidth: col.minWidth,
          flex: col.flex,
          align: col.align,
          headerAlign: col.align,
          valueGetter: (params) => {
            const r = params.row as T;
            if (col.getValue) return col.getValue(r);
            // Support nested dot paths `a.b.c`
            if (typeof col.key === 'string' && col.key.includes('.')) {
              const path = col.key.split('.');
              let current: any = r as any;
              for (const p of path) {
                current = current?.[p];
              }
              return current;
            }
            return (r as any)[col.key as any];
          },
          renderCell: (params: GridRenderCellParams<any, any>) => {
            const r = params.row as T;
            const v = params.value;
            if (col.render) return <>{col.render(r, v)}</>;
            if (col.valueFormatter) return <>{col.valueFormatter(v, r)}</>;
            return <>{String(v ?? '')}</>;
          },
        };
        return colDef;
      }),
    [columns]
  );

  // Sort model: DataGrid uses array of {field, sort}
  const sortModel = useMemo(() => {
    if (!sortBy || !sortDir) return [];
    return [{ field: sortBy, sort: sortDir }];
  }, [sortBy, sortDir]);

  // Colorful styling
  const colorfulSx =
    colorScheme === 'rainbow'
      ? {
          '& .MuiDataGrid-columnHeaders': {
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: theme.palette.getContrastText(theme.palette.primary.main),
            borderBottom: 'none',
          },
          '& .MuiDataGrid-row:nth-of-type(odd)': {
            backgroundColor: theme.palette.action.hover,
          },
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: `${theme.palette.info.light}33`,
            '&:hover': { backgroundColor: `${theme.palette.info.light}55` },
          },
        }
      : colorScheme === 'brand'
        ? {
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.primary.dark,
              color: theme.palette.getContrastText(theme.palette.primary.dark),
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }
        : {
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: theme.palette.action.hover,
            },
          };

  return (
    <Box sx={{ width: '100%', height }}>
      <DataGrid
        rows={rows as any[]}
        getRowId={(r) => getRowId(r as T) as GridRowId}
        columns={gridCols}
        loading={loading}
        rowCount={rowCount}
        paginationMode="server"
        sortingMode="server"
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(m) => {
          if (m.pageSize !== pageSize) onPageSizeChange(m.pageSize);
          if (m.page !== page) onPageChange(m.page);
        }}
        sortModel={sortModel}
        onSortModelChange={(model) => {
          const first = model?.[0];
          if (!first) {
            onSortChange?.(undefined, undefined);
          } else {
            onSortChange?.(first.field, (first.sort ?? 'asc') as SortDir);
          }
        }}
        checkboxSelection={enableSelection}
        disableRowSelectionOnClick
        rowSelectionModel={selectedIds?.ids}
        onRowSelectionModelChange={(model) => {
          onSelectionChange?.(model);
        }}
        slots={{
          toolbar: () => (
            <Toolbar
              enableSelection={enableSelection}
              selectedCount={selectedIds?.ids.size ?? 0}
              onDeleteSelected={onDeleteSelected}
              onRefresh={onRefresh}
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              onAddClick={onAddClick}
              addLabel={addLabel}
            />
          ),
        }}
        sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          '& .MuiDataGrid-cell': {
            borderColor: theme.palette.divider,
          },
          ...colorfulSx,
        }}
      />
    </Box>
  );
}
