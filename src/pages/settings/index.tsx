import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { PasswordSection } from './PasswordSection';
import { ProfileSection } from './ProfileSection';
import { StudioSection } from './StudioSection';

const TABS = ['profile', 'password', 'studio'] as const;
type SettingsTab = (typeof TABS)[number];

const isTab = (value: string | null): value is SettingsTab =>
  TABS.includes(value as SettingsTab);

const SECTIONS: Record<SettingsTab, () => React.JSX.Element> = {
  profile: ProfileSection,
  password: PasswordSection,
  studio: StudioSection,
};

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  // The tab lives in the URL (?tab=studio) so it survives reloads and can be linked.
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: SettingsTab = isTab(requested) ? requested : 'profile';
  const Section = SECTIONS[tab];

  return (
    <Container
      maxWidth="md"
      sx={{ py: { xs: 2, sm: 3 }, px: { xs: 0, sm: 3 } }}
    >
      <Typography variant="h5" fontWeight={700}>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t('intro')}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_e, value: SettingsTab) => setParams({ tab: value })}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((key) => (
          <Tab key={key} value={key} label={t(`tabs.${key}`)} />
        ))}
      </Tabs>

      <Box>
        <Section />
      </Box>
    </Container>
  );
}
