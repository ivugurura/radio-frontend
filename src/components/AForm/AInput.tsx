import React from 'react';

import { TextField, MenuItem, type TextFieldProps } from '@mui/material';

import { styles } from './styles';

interface OptionType {
  [key: string]: string;
}

export interface AInputProps
  extends Omit<TextFieldProps, 'select' | 'value' | 'options'> {
  id?: string;
  type?: string;
  select?: boolean;
  options?: OptionType[];
  value?: any;
  size?: 'small' | 'medium';
  valueSelector?: string;
  labelSelector?: string;
}

export const AInput: React.FC<AInputProps> = (props) => {
  const {
    id,
    type = 'text',
    select = false,
    options = [],
    value = '',
    size = 'medium',
    valueSelector = 'id',
    labelSelector = 'name',
    ...inputProps
  } = props;
  return (
    <TextField
      sx={styles.textfield}
      type={type}
      fullWidth
      select={select}
      size={size}
      value={value || ''}
      id={id || inputProps.name}
      {...inputProps}
    >
      {select &&
        options.map((option) => (
          <MenuItem key={option[valueSelector]} value={option[valueSelector]}>
            {option[labelSelector]}
          </MenuItem>
        ))}
    </TextField>
  );
};
