import React from 'react';

import { FormControlLabel, Switch, type SwitchProps } from '@mui/material';

interface ASwitchProps extends Omit<SwitchProps, 'checked'> {
  value?: boolean;
  label?: React.ReactNode;
  name?: string;
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => void;
}
export const ASwitch: React.FC<ASwitchProps> = (props) => {
  const { value, label, name, onChange } = props;
  return (
    <FormControlLabel
      control={
        <Switch
          checked={value ?? false}
          onChange={onChange}
          name={name}
          slotProps={{ input: { 'aria-label': 'controlled' } }}
        />
      }
      label={label}
    />
  );
};
