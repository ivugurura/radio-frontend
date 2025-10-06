import type { IStateSchema } from '../../appTypes/states';

export const TestState: IStateSchema = {
  entity: 'Test',
  actions: {
    create: {
      api: {
        verb: 'POST',
        endpoint: '/tests',
        hasBody: true,
      },
    },
    custom: {
      api: {
        verb: 'GET',
        endpoint: '/tests/custom',
        hasBody: false,
      },
    },
  },
};
