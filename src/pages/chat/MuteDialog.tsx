import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

const DURATION_OPTIONS: Array<{ label: string; value: number | 'permanent' }> =
  [
    { label: '1 minute', value: 1 },
    { label: '2 minutes', value: 2 },
    { label: '5 minutes', value: 5 },
    { label: '10 minutes', value: 10 },
    { label: '1 hour', value: 60 },
    { label: '24 hours', value: 1440 },
    { label: 'Permanent', value: 'permanent' },
  ];

type MuteDialogProps = {
  open: boolean;
  listenerName: string;
  onClose: () => void;
  onConfirm: (opts: { reason?: string; expiresInMinutes?: number }) => void;
};

export default function MuteDialog({
  open,
  listenerName,
  onClose,
  onConfirm,
}: MuteDialogProps) {
  const [reason, setReason] = React.useState('');
  const [duration, setDuration] = React.useState<number | 'permanent'>(60);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setDuration(60);
    }
  }, [open]);

  const handleDurationChange = (event: SelectChangeEvent<string>) => {
    const raw = event.target.value;
    setDuration(raw === 'permanent' ? 'permanent' : Number(raw));
  };

  const handleConfirm = () => {
    onConfirm({
      reason: reason.trim() || undefined,
      expiresInMinutes: duration === 'permanent' ? undefined : duration,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mute {listenerName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This listener won't be able to send new chat messages until unmuted.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="mute-duration-label">Duration</InputLabel>
            <Select
              labelId="mute-duration-label"
              label="Duration"
              value={String(duration)}
              onChange={handleDurationChange}
            >
              {DURATION_OPTIONS.map((option) => (
                <MenuItem key={option.label} value={String(option.value)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Reason (optional)"
            size="small"
            multiline
            minRows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          Mute
        </Button>
      </DialogActions>
    </Dialog>
  );
}
