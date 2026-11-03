import React from 'react';

import { Box, Button, Typography } from '@mui/material';

export const isErrorLike = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  ('stack' in value || 'message' in value) &&
  !('__typename' in value);
// A lazily loaded page whose chunk vanished, usually because a deploy replaced
// the hashed files while this tab was open. Vite's dynamic import() rejects
// with browser-specific messages (Chrome, Firefox, Safari respectively).
const CHUNK_ERROR_RE =
  /loading css chunk|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;
const isChunkLoadError = (value: unknown) =>
  isErrorLike(value) &&
  value instanceof Error &&
  (value.name === 'ChunkLoadError' || CHUNK_ERROR_RE.test(value.message));
const asError = (value: unknown) => {
  if (value instanceof Error) {
    return value;
  }
  if (isErrorLike(value)) {
    return Object.assign(
      new Error((value as Record<string, unknown>).message as string),
      value,
    );
  }
  return new Error(String(value));
};

export interface ErrorBoundaryProps {
  location?: unknown;
  render?: (error: Error) => React.ReactNode;
  extraContext?: React.ReactNode;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

export class ErrorBoundary extends React.PureComponent<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { error: asError(error) };
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    const { location } = this.props;
    if (previousProps.location !== location) {
      this.setState({ error: undefined });
    }
  }

  onReloadClick() {
    window.location.reload();
  }

  render() {
    const { error } = this.state;
    const { render, extraContext, children } = this.props;
    if (error !== undefined) {
      if (isChunkLoadError(error)) {
        return (
          <Box sx={{ textAlign: 'center', padding: 2 }}>
            <Typography>A new version of The SITE is available.</Typography>
            <Button onClick={this.onReloadClick}>Reload to update</Button>
          </Box>
        );
      }
      if (render) {
        return render(error);
      }
      return (
        <Box sx={{ textAlign: 'center', padding: 2 }}>
          <Typography>
            The SITE encountered an unexpected error. If reloading the page does
            not fix it, contact your site admin or The SITE support.
          </Typography>
          <Typography className="text-wrap">{error.message}</Typography>
          {extraContext}
        </Box>
      );
    }
    return children;
  }
}
