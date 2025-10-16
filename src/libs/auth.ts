import { createApolloClient } from '@graphql/client';
import type { UserProfileQuery } from '@graphql/graphql';
import { USER_PROFILE } from '@graphql/queries';

export const validateUserAuthentication = async () => {
  const result = {
    isAuthenticated: false,
    errorMessage: '',
    data: null as UserProfileQuery['me'] | null,
  };

  return createApolloClient()
    .query<UserProfileQuery>({
      query: USER_PROFILE,
    })
    .then(({ data, error }) => {
      if (data) {
        result.isAuthenticated = true;
        result.data = data.me;
      } else {
        result.errorMessage = error?.message || 'Unknown error';
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
