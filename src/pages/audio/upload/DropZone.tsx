import React, { useCallback, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CloudUploadOutlined as CloudUploadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { RECOMMENDED_BATCH_SIZE } from './constants';

type DropZoneProps = Readonly<{
  onFiles: (files: FileList | null) => void;
}>;

export const DropZone = ({ onFiles }: DropZoneProps) => {
  const { t } = useTranslation('audio');
  const [dragging, setDragging] = useState(false);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiles(e.target.files);
      e.currentTarget.value = ''; // reset so same file can be chosen again
    },
    [onFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      onFiles(e.dataTransfer.files);
    },
    [onFiles],
  );

  return (
    <Box
      component="label"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 4,
        px: 2,
        textAlign: 'center',
        cursor: 'pointer',
        borderRadius: 2,
        border: '2px dashed',
        borderColor: dragging ? 'primary.main' : 'divider',
        bgcolor: dragging
          ? alpha(theme.palette.primary.main, 0.08)
          : 'action.hover',
        transition: 'border-color 120ms, background-color 120ms',
        '&:hover': { borderColor: 'primary.main' },
      })}
    >
      <CloudUploadIcon color="primary" sx={{ fontSize: 44 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {t('upload.dropTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('upload.dropHint', { batch: RECOMMENDED_BATCH_SIZE })}
      </Typography>
      <input
        hidden
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileInput}
      />
    </Box>
  );
};
