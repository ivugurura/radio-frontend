# React UI boilerplate

This project is a React + TypeScript template built with Vite, designed for rapid development of modern admin dashboards and business applications.

## Features

- **React 19** with **TypeScript**
- **Vite** for fast development and builds
- **Material UI (MUI)** for UI components and theming
- **Redux Toolkit** for state management
- **React Router v7** for routing
- **Error Boundary** for graceful error handling
- **React Toastify** for notifications
- **Axios** for HTTP requests
- **JWT Decode** for authentication token parsing
- **CryptoJS** for encryption/decryption
- **Project structure** with alias support (`@/` for `src/`)
- **Linting** with ESLint
- **Ready-to-use layout** with responsive sidebar and topbar
- **Code splitting** with React Suspense and lazy loading
- **Unit test ready** (add your preferred test runner)

## Project Structure

```
src/
  components/
    errors/
      ErrorBoundary.tsx
    Layout.tsx
  pages/
    Dashboard.tsx
    Login.tsx
  redux/
    store.ts
  theme/
    theme.ts
  routes.tsx
  App.tsx
  main.tsx
```

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

2. **Run the development server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```

3. **Build for production:**
   ```sh
   npm run build
   # or
   yarn build
   ```

4. **Preview production build:**
   ```sh
   npm run preview
   # or
   yarn preview
   ```

## Customization

- Update the sidebar and routes in `src/components/Layout.tsx` and `src/routes.tsx`.
- Add new pages in `src/pages/`.
- Update theme in `src/theme/theme.ts`.
- Use the ErrorBoundary for robust error handling in your components.

## Aliases

- Use `@/` to import from `src/` (configured in `vite.config.ts` and `tsconfig.json`).

## Linting

- Run `npm run lint` to check code quality.

---

This template is ready for you to clone and start building your next admin dashboard or business app!
