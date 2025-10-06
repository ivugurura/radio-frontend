import { Typography, type TypographyProps } from '@mui/material';
import { currentYear } from '../libs/constants';

export const Copyright = (props: TypographyProps) => (
  <Typography variant="body2" color="text.secondary" align="center" {...props}>
    &copy;
    {` Copyright 2025-${currentYear}, AJA. All rights reserved.`}
  </Typography>
);
