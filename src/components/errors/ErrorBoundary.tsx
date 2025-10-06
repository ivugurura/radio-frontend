import React from 'react';

import { Box, Button, Typography } from '@mui/material';

export const isErrorLike = (value: any) =>
  typeof value === 'object' &&
  value !== null &&
  ('stack' in value || 'message' in value) &&
  !('__typename' in value);
const isWebpackChunkError = (value: any) =>
  isErrorLike(value) &&
  (value.name === 'ChunkLoadError' ||
    /loading css chunk/gi.test(value.message));
const asError = (value: any) => {
  if (value instanceof Error) {
    return value;
  }
  if (isErrorLike(value)) {
    return Object.assign(new Error(value.message), value);
  }
  return new Error(String(value));
};

export interface ErrorBoundaryProps {
  location?: any;
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
  // eslint-disable-next-line react/state-in-constructor
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
    window.location.reload(); // hard page reload
  }

  render() {
    const { error } = this.state;
    const { render, extraContext, children } = this.props;
    if (error !== undefined) {
      if (isWebpackChunkError(error)) {
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
