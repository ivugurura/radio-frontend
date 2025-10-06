import { http } from './http';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

export const validateUserAuthentication = async () => {
  const result = {
    isAuthenticated: false,
    errorMessage: '',
    data: null as UserProfile | null,
  };

  return http
    .get('/users/my-profile')
    .then((response) => {
      if (response.data.data) {
        result.isAuthenticated = true;
        result.data = response.data.data;
      } else {
        result.errorMessage = response.data.message;
      }
      return result;
    })
    .catch((error) => {
      if (error.response) {
        result.errorMessage = error.response.data.message;
      } else {
        result.errorMessage = error.message;
      }
      return result;
    });
};
