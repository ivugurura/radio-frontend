import React from 'react';
import { Card, CardContent, CardHeader, Divider } from '@mui/material';

type SettingsCardProps = Readonly<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}>;

export const SettingsCard = ({
  title,
  subtitle,
  children,
}: SettingsCardProps) => (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardHeader
      title={title}
      subheader={subtitle}
      slotProps={{
        title: { variant: 'subtitle1', fontWeight: 600 },
        subheader: { variant: 'body2' },
      }}
    />
    <Divider />
    <CardContent>{children}</CardContent>
  </Card>
);
