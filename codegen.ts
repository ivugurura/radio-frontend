import type { CodegenConfig } from '@graphql-codegen/cli';

// Apollo Client v4+ recommendation: use the `client` preset instead of typescript-react-apollo.
// This generates a typed `graphql()` tag and TypedDocumentNodes that work with @apollo/client v4 hooks.
const config: CodegenConfig = {
  schema: process.env.CODEGEN_SCHEMA,
  // Look for GraphQL operations in TS/TSX files and .graphql documents
  documents: ['src/**/*.{ts,tsx,graphql,gql}'],
  generates: {
    'src/graphql/generated/': {
      preset: 'client',
      plugins: [],
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        // Optional: if you keep using `gql` temporarily, set gqlTagName to pick those up.
        // It's better to migrate usages to the generated `graphql` tag.
        // gqlTagName: 'gql',
      },
    },
    'src/graphql/generated/hooks.ts': {
      plugins: [{ './codegen-plugins/apollo-v4-hooks.js': {} }],
    },
  },
};
export default config;
