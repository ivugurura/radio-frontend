import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Chip,
  Autocomplete,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Audio } from './types';

type CreateAudioDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (
    audio: Omit<Audio, 'id' | 'createdAt'> & { file?: File | null }
  ) => void;
  suggestedTags?: string[];
};

export default function CreateAudioDialog({
  open,
  onClose,
  onCreate,
  suggestedTags = ['news', 'music', 'talk', 'interview', 'live'],
}: CreateAudioDialogProps) {
  const [title, setTitle] = React.useState('');
  const [artist, setArtist] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setTitle('');
    setArtist('');
    setTags([]);
    setFile(null);
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose();
    }
  };

  const handleFilePick = (f: File | null) => {
    setFile(f);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFilePick(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFilePick(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const isValid = title.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    // UI only: simulate async
    setTimeout(() => {
      onCreate({
        title: title.trim(),
        artist: artist.trim() || undefined,
        tags: tags.length ? tags : undefined,
        status: 'processing',
        durationSec: undefined,
        file,
      });
      setSubmitting(false);
      reset();
      onClose();
    }, 500);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Audio</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            helperText={!title ? 'Title is required' : ' '}
            error={!isValid}
            fullWidth
          />
          <TextField
            label="Artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            fullWidth
          />
          <Autocomplete
            multiple
            freeSolo
            options={suggestedTags}
            value={tags}
            onChange={(_, v) => setTags(v)}
            renderTags={(value: readonly string[], getTagProps) =>
              value.map((option: string, index: number) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Add tag" />
            )}
          />
          <Box
            onDrop={onDrop}
            onDragOver={onDragOver}
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: (t) =>
                t.palette.mode === 'light' ? 'grey.50' : 'grey.900',
            }}
          >
            <CloudUploadIcon color="action" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Drag and drop an audio file here, or click to browse
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported: mp3, wav, aac, ogg (UI only)
              </Typography>
            </Box>
            <Button component="label" variant="outlined" size="small">
              Browse
              <input
                hidden
                type="file"
                accept="audio/*"
                onChange={onFileInputChange}
              />
            </Button>
          </Box>

          {file ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
              }}
            >
              <Box>
                <Typography variant="body2">{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </Typography>
              </Box>
              <IconButton
                aria-label="remove file"
                onClick={() => handleFilePick(null)}
                size="small"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          variant="contained"
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
