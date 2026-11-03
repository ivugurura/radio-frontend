import { List } from '@mui/material';
import type { UploadItem } from './types';
import { UploadRow, type UploadRowActions } from './UploadRow';

type UploadListProps = UploadRowActions &
  Readonly<{
    items: UploadItem[];
  }>;

export const UploadList = ({ items, ...actions }: UploadListProps) => (
  <List
    dense
    disablePadding
    sx={{
      maxHeight: 360,
      overflow: 'auto',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
    }}
  >
    {items.map((it, idx) => (
      <UploadRow
        key={it.id}
        item={it}
        divider={idx < items.length - 1}
        {...actions}
      />
    ))}
  </List>
);
