import { Box, CircularProgress } from '@mui/material';

/** Suspense fallback while a lazily loaded page's code downloads. */
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '40vh',
    }}
  >
    <CircularProgress />
  </Box>
);

export default PageLoader;
