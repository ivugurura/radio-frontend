import { type MFFormField } from 'react-mui-form';

export const loginSchema = () => [
  [
    {
      name: 'email',
      label: 'Email address',
      size: 'medium',
      autoComplete: 'email',
      autoFocus: true,
    },
  ] as MFFormField[],
  [
    {
      name: 'password',
      fieldType: 'password',
      label: 'Password',
      autoComplete: 'current-password',
      size: 'medium',
    },
  ] as MFFormField[],
];
