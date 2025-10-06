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
import { loginSchema } from './schema';
import { MFForm } from 'react-mui-form';
import { actions, setUser } from '../../redux/actions';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { lStorage, notifier } from '../../libs/constants';

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
  const [loginInfo, setLoginInfo] = useState(initialStates);

  const [loginUser, { isLoading, isSuccess, data }] =
    actions.useLoginAuthMutation();

  const dispatch = useDispatch();

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && shouldRedirect) {
      redirectToDashboard();
    }
  }, [isAuthenticated, shouldRedirect]);

  useEffect(() => {
    if (isSuccess && data) {
      const {
        message,
        data: { token, ...user },
      } = data;
      let messageToShow = message;
      if (shouldRedirect) {
        messageToShow += '. Be redirected in 3 seconds';
      }
      notifier.success(messageToShow);
      lStorage.save(token);
      dispatch(setUser(user));
      if (!shouldRedirect) {
        window.location.reload();
      }
    }
  }, [isSuccess, shouldRedirect]);

  const handleSubmit = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    loginUser(loginInfo);
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
          Sign in
        </Typography>
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <MFForm
            fields={loginSchema()}
            states={loginInfo}
            setStates={setLoginInfo}
          />
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          {/* <Grid container>
              <Grid item xs>
                <Link href="j" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="n" variant="body2">
                  Dont have an account? Sign Up
                </Link>
              </Grid>
            </Grid> */}
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
};

export default Login;
