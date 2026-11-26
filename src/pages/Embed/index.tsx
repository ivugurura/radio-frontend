import React from 'react';
import { Box, GlobalStyles, useColorScheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RadioStreamPlayer from '@components/RadioStreamPlayer';

/**
 * Bare player for other sites to put in an iframe, e.g.
 * `<iframe src="https://radio.reformationvoice.org/embed?lang=rw&theme=dark">`.
 *
 * - `lang`: picks the language, and so the studio (handled in i18n setup).
 * - `theme`: `light` or `dark`, to match the host page. Defaults to light.
 *
 * The page background is transparent so the host's card shows through.
 */
const EmbedPage: React.FC = () => {
  const { t } = useTranslation('home');
  const { setMode } = useColorScheme();
  const [theme] = React.useState<'light' | 'dark'>(() =>
    new URLSearchParams(window.location.search).get('theme') === 'dark'
      ? 'dark'
      : 'light',
  );

  React.useEffect(() => {
    setMode(theme);
  }, [setMode, theme]);

  return (
    <>
      <GlobalStyles
        styles={{
          'html, body': { background: 'transparent !important' },
          // Keep the document's scheme fixed at light, whatever the palette.
          // The host iframe declares the same scheme; if the two differ, the
          // browser paints an opaque backdrop behind this transparent page.
          html: { colorScheme: 'light !important' },
          // App-wide toasts don't fit in a small iframe; the player shows
          // its own error state.
          '.Toastify': { display: 'none' },
        }}
      />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <RadioStreamPlayer
          variant="hero"
          title={t('stationTitle')}
          showTitle={false}
          showVolumeControl
        />
      </Box>
    </>
  );
};

export default EmbedPage;
