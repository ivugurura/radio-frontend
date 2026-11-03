/** GraphQL errors from the API are already translated; show the first one. */
export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;
