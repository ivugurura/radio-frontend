import React, { useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  LinkRounded as LinkRoundedIcon,
  ShareRounded as ShareRoundedIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import { useLanguage } from './providers/LanguageContext';
import {
  buildShareUrl,
  facebookShareUrl,
  whatsAppShareUrl,
} from '@libs/share';

/** Share button for the public page: WhatsApp, Facebook or copy the link. */
const ShareRadioButton: React.FC = () => {
  const { t } = useTranslation('home');
  const { language } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(language);
  const message = t('share.message', { station: t('stationTitle') });
  const close = () => setAnchorEl(null);

  const copyLink = async () => {
    close();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied): fall back to a prompt
      // the listener can copy from.
      window.prompt(t('share.copyLink'), shareUrl);
    }
  };

  return (
    <>
      <Tooltip title={t('share.button')}>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={t('share.button')}
          aria-haspopup="menu"
          aria-expanded={anchorEl ? 'true' : undefined}
        >
          <ShareRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          component="a"
          href={whatsAppShareUrl(message, shareUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
        >
          <ListItemIcon>
            <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
          </ListItemIcon>
          <ListItemText>{t('share.whatsapp')}</ListItemText>
        </MenuItem>
        <MenuItem
          component="a"
          href={facebookShareUrl(shareUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
        >
          <ListItemIcon>
            <FacebookIcon fontSize="small" sx={{ color: '#1877F2' }} />
          </ListItemIcon>
          <ListItemText>{t('share.facebook')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => void copyLink()}>
          <ListItemIcon>
            <LinkRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('share.copyLink')}</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message={t('share.copied')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default ShareRadioButton;
