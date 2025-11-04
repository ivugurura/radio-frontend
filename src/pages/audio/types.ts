export type AudioStatus = 'ready' | 'processing' | 'failed';

export type Audio = {
  id: string;
  title: string;
  artist?: string;
  durationSec?: number;
  tags?: string[];
  createdAt: string; // ISO string
  status?: AudioStatus;
};
