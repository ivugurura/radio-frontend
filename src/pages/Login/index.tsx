import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Typography,
} from '@mui/material';

import { Copyright } from '../../components/Copyright';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loginSchema } from './schema';
import { MFForm } from 'react-mui-form';
import { useLoginUserMutation } from '@graphql/hooks';
import { lStorage, notifier } from '@libs/constants';
import { useAuth } from '@components/providers/AuthContext';
import type { UserType } from '@graphql/graphql';

const initialStates = {
  email: '',
  password: '',
};
const redirectToDashboard = () => {
  setTimeout(() => {
    window.location.replace('/admin');
  }, 5000);
};
const Login = ({ shouldRedirect = false }) => {
  const { t } = useTranslation('auth');
  const [loginInfo, setLoginInfo] = useState(initialStates);
  const [loginUser, { loading, data }] = useLoginUserMutation();

  const { isAuthenticated, setAuthUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated && shouldRedirect) {
      redirectToDashboard();
    }
  }, [isAuthenticated, shouldRedirect]);

  useEffect(() => {
    if (data?.loginUser) {
      const { token, restToken, user } = data.loginUser;
      const messageToShow = shouldRedirect
        ? t('welcomeBackRedirect', { name: user?.firstName })
        : t('welcomeBack', { name: user?.firstName });

      notifier.success(messageToShow);
      lStorage.save(token!, restToken ?? undefined);
      setAuthUser(user as UserType);
      if (!shouldRedirect) {
        window.location.reload();
      }
    }
  }, [data?.loginUser, shouldRedirect]);

  const handleSubmit = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    loginUser({ variables: { ...loginInfo } });
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {t('signInTitle')}
        </Typography>
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <MFForm
            fields={loginSchema()}
            states={loginInfo}
            setStates={setLoginInfo}
          />
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label={t('rememberMe')}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t('signingIn') : t('signIn')}
          </Button>
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
};

export default Login;
