import type { UsersQuery } from '@graphql/graphql';

export type ManagedUserRow = UsersQuery['users']['items'][number];
export type UserStatusValue = ManagedUserRow['status'];
