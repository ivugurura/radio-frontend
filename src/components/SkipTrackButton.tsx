import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { SkipNextRounded as SkipNextRoundedIcon } from '@mui/icons-material';
import { useSkipTrackMutation } from '@graphql/hooks';
import { notifier } from '@libs/constants';
import ConfirmDialog from '../pages/audio/ConfirmDialog';
import type { NowPlayingInfo } from './RadioStreamPlayer';

type Props = NowPlayingInfo & { studioId: string };

/**
 * Skips the AutoDJ track on air. Goes through the backend, which checks the
 * user's studio role before asking the studio to skip.
 */
const SkipTrackButton: React.FC<Props> = ({
  studioId,
  isLive,
  currentTrack,
  refreshMetadata,
}) => {
  const { t } = useTranslation('layout');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [skipTrack, { loading }] = useSkipTrackMutation();

  const disabled = loading || isLive || !currentTrack;
  let tooltip = t('skip.tooltip');
  if (isLive) tooltip = t('skip.disabledLive');
  else if (!currentTrack) tooltip = t('skip.disabledNoTrack');

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      await skipTrack({ variables: { studioId } });
      notifier.success(t('skip.success', { track: currentTrack }));
    } catch (err) {
      notifier.error(err instanceof Error ? err.message : t('skip.error'));
    } finally {
      refreshMetadata();
    }
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <span>
          <IconButton
            size="small"
            color="warning"
            onClick={() => setConfirmOpen(true)}
            disabled={disabled}
            aria-label={t('skip.tooltip')}
          >
            {loading ? (
              <CircularProgress size={18} />
            ) : (
              <SkipNextRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <ConfirmDialog
        open={confirmOpen}
        title={t('skip.confirmTitle')}
        message={t('skip.confirmMessage', { track: currentTrack })}
        confirmText={t('skip.confirm')}
        cancelText={t('skip.cancel')}
        confirmColor="warning"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default SkipTrackButton;
