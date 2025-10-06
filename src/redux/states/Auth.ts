import type { IStateSchema } from '../../appTypes/states';

export const AuthState: IStateSchema = {
  entity: 'Auth',
  actions: {
    login: {
      api: {
        endpoint: '/auth/login',
        verb: 'POST',
        hasBody: true,
      },
    },
    logout: {
      api: {
        endpoint: '/auth/logout',
        verb: 'POST',
      },
    },
  },
};
