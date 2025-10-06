/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { dataArr, dataObj } from './initialStates';
import { formulateQuery, startCase } from './utils';
// import { generateSignature } from '../libs/utils';
import { lStorage } from '../libs/constants';
import { buildAppStates } from './stateBuilder';
import type { EndpointDefinitions } from '@reduxjs/toolkit/query';
import type { IActionSchema, IStateSchema } from '../appTypes/states';

const states = buildAppStates();

const buildApiEndpoints = (build: any, state: IStateSchema) => {
  const { actions } = state;
  const endpoints = {} as EndpointDefinitions;
  Object.keys(actions).forEach((key) => {
    const current = actions[key] as IActionSchema;
    let buildType = 'query';
    if (current?.api?.verb !== 'GET' || current?.api?.isMutation) {
      buildType = 'mutation';
    }
    endpoints[current.action!] = build[buildType]({
      query: formulateQuery(current.api),
    });
  });
  return endpoints;
};

const formatBaseQuery = () => {
  // const { timestamp, hash } = generateSignature();
  return fetchBaseQuery({
    // Fill in your own server starting URL here
    baseUrl: `${import.meta.env.VITE_APP_API_URL}/api/v1`,
    headers: {
      Authorization: lStorage.token,
      // 'X-Timestamp': timestamp,
      // 'X-Signature': hash,
    },
  });
};
const buildAppApis = () => {
  const baseQuery = formatBaseQuery();

  return states.map((state) =>
    createApi({
      reducerPath: `${startCase(state.entity, false)}Api`,
      baseQuery: async (args, api, extraOptions) => {
        const result = await baseQuery(args, api, extraOptions);
        // if (result.data?.totalItems) {
        //   return { data: { ...result.data } };
        // }
        return result;
      },
      endpoints: (build) => buildApiEndpoints(build, state),
    })
  );
};

const buildApiSlicers = () => {
  const apis = buildAppApis();
  const utils = {
    reducers: {},
    middlewares: [],
    actions: {},
    initials: { ...dataObj, ...dataArr },
  } as any;

  apis.forEach((api) => {
    utils.reducers[api.reducerPath] = api.reducer;
    utils.middlewares.push(api.middleware);

    (Object.keys(api) as Array<keyof typeof api>).forEach((key) => {
      if (
        typeof key === 'string' &&
        key.startsWith('use') &&
        !key.includes('Lazy') &&
        key !== 'usePrefetch'
      ) {
        utils.actions[key] = api[key];
      }
    });
  });

  return utils;
};

const slicers = buildApiSlicers();

export const {
  actions: slicedActions,
  initials,
  reducers,
  middlewares,
} = slicers;
