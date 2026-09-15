import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { useTranslation } from 'react-i18next';

import { useLanguage } from './providers/LanguageContext';
import {
  LANGUAGE_LABELS,
  LANGUAGE_SHORT_LABELS,
  isSupportedLanguage,
} from '../i18n/config';

interface LanguageSelectorProps {
  /** `full` shows the native name, `short` shows the code (for tight toolbars). */
  variant?: 'full' | 'short';
  size?: 'small' | 'medium';
  /** Render a floating label above the control. */
  withLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'full',
  size = 'small',
  withLabel = false,
}) => {
  const { t } = useTranslation('common');
  const { language, languages, setLanguage } = useLanguage();

  const handleChange = (event: SelectChangeEvent) => {
    const next = event.target.value;
    if (isSupportedLanguage(next)) {
      setLanguage(next);
    }
  };

  const label = t('language');

  return (
    <FormControl size={size} sx={{ minWidth: variant === 'short' ? 88 : 140 }}>
      {withLabel && <InputLabel id="language-selector-label">{label}</InputLabel>}
      <Select
        labelId="language-selector-label"
        label={withLabel ? label : undefined}
        value={language}
        onChange={handleChange}
        aria-label={t('selectLanguage')}
        startAdornment={
          <TranslateRoundedIcon
            fontSize="small"
            sx={{ mr: 1, color: 'text.secondary' }}
          />
        }
      >
        {languages.map((lng) => (
          <MenuItem key={lng} value={lng}>
            {variant === 'short'
              ? LANGUAGE_SHORT_LABELS[lng]
              : LANGUAGE_LABELS[lng]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;
