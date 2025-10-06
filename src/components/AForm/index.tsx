import React, { useEffect } from 'react';

import { Grid } from '@mui/material';

import { ADateInput } from './ADateInput';
import { AInput } from './AInput';
import { APassword } from './APassword';
import { ASwitch } from './ASwitch';

export interface AFormField {
  name: string;
  label?: string;
  value?: any;
  fieldType?: 'text-field' | 'password' | 'date' | 'switch-field';
  isBool?: boolean;
  hide?: boolean;
  [key: string]: any;
}

interface AFormProps<T extends Record<string, any>> {
  fields: AFormField[][];
  states: T | null;
  setStates: React.Dispatch<React.SetStateAction<T>>;
}

// Interface for handleChange function
type HandleChangeFn = (params: {
  name: string;
  isBool?: boolean;
}) => (ev: React.ChangeEvent<HTMLInputElement>) => void;

// Interface for handleDateChange function
type HandleDateChangeFn = (name: string) => (dateVal: any) => void;

// Interface for getFieldView function
type GetFieldViewFn = (
  field: Omit<AFormField, 'hide'> & { hide?: boolean },
  idx: number
) => React.ReactNode;

// Interface for getSizes function
type GetSizesFn = (rowsLength: number) => {
  lg: number;
  md: number;
  sm: number;
  xs: number;
};

export const AForm = <T extends Record<string, any>>({
  fields,
  states,
  setStates,
}: AFormProps<T>) => {
  const [localFields, setLocalFields] = React.useState(fields);
  useEffect(() => {
    if (states) {
      const newFields = fields.map((f) =>
        f.map((row) => {
          const { name } = row;
          if (states[name]) {
            return { ...row, value: states[name] };
          }
          return row;
        })
      );
      setLocalFields(newFields);
    }
  }, [states, fields]);
  const handleChange: HandleChangeFn =
    ({ name, isBool }) =>
    (ev) => {
      const { value, checked } = ev.target;
      const inputValue = isBool ? checked : value;
      const newFields = localFields.map((f) =>
        f.map((r) => {
          if (r.name === name) {
            return { ...r, value: inputValue };
          }
          return r;
        })
      );
      setLocalFields(newFields);
      setStates((prev) => ({ ...prev, [name]: inputValue }));
    };
  const handleDateChange: HandleDateChangeFn = (name) => (dateVal) => {
    const newFields = localFields.map((f) =>
      f.map((r) => {
        if (r.name === name) {
          return { ...r, value: dateVal };
        }
        return r;
      })
    );
    setLocalFields(newFields);
    setStates((prev) => ({ ...prev, [name]: dateVal }));
  };
  const getFieldView: GetFieldViewFn = (
    { fieldType, accept, ...vProps },
    idx
  ) => {
    switch (fieldType) {
      case 'switch-field':
        return (
          <ASwitch
            key={`sf-${idx}`}
            onChange={handleChange(vProps as any)}
            {...vProps}
          />
        );
      case 'password':
        return (
          <APassword
            key={`sf-${idx}`}
            onChange={handleChange(vProps as any)}
            {...vProps}
          />
        );
      case 'date':
        return (
          <ADateInput onChange={handleDateChange(vProps.name)} {...vProps} />
        );
      case 'text-field':
      default:
        return (
          <AInput
            key={`ft-${idx}`}
            onChange={handleChange(vProps as any)}
            {...vProps}
          />
        );
    }
  };
  const getSizes: GetSizesFn = (rowsLength) => {
    const sizes = {
      lg: 12,
      md: 12,
      sm: 12,
      xs: 12,
    };
    if (rowsLength === 2) {
      return { ...sizes, lg: 6, md: 6 };
    }
    if (rowsLength === 3) {
      return { ...sizes, lg: 4, md: 4 };
    }
    if (rowsLength === 4) {
      return { ...sizes, lg: 3, md: 3 };
    }
    return sizes;
  };

  return (
    <Grid container spacing={2}>
      {localFields.map((rows, fIdx) =>
        rows.map(({ hide, ...ro }, rIdx) => {
          if (hide) return null;
          return (
            <Grid
              key={`field-grid-${fIdx}-${rIdx}`}
              size={getSizes(rows.length)}
            >
              {getFieldView(ro, rIdx)}
            </Grid>
          );
        })
      )}
    </Grid>
  );
};
