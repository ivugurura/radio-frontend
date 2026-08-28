import * as React from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { notifier } from '@libs/constants';

type CopyFieldProps = {
  label: string;
  value: string;
  secret?: boolean;
};

export default function CopyField({ label, value, secret = false }: CopyFieldProps) {
  const [revealed, setRevealed] = React.useState(!secret);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      notifier.success(`${label} copied`);
    } catch {
      notifier.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <TextField
      label={label}
      value={value}
      type={secret && !revealed ? 'password' : 'text'}
      fullWidth
      size="small"
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            {secret ? (
              <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
                <IconButton
                  size="small"
                  onClick={() => setRevealed((r) => !r)}
                  edge="end"
                >
                  {revealed ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Copy">
              <IconButton size="small" onClick={() => void handleCopy()} edge="end">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}
