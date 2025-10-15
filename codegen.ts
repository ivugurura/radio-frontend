import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.CODEGEN_SCHEMA,
  documents: ['src/graphql/**/*.{ts,tsx}'],
  generates: {
    'src/graphql/generated/types.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        enumsAsTypes: true,
      },
    },
  },
};
export default config;
