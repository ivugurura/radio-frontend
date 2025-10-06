import React from 'react';

import {
  DatePicker,
  LocalizationProvider,
  type DatePickerProps,
} from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export const ADateInput: React.FC<DatePickerProps> = (props) => {
  const { value, ...otherProps } = props;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker value={value || null} {...otherProps} />
    </LocalizationProvider>
  );
};
