import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context }) => {
    const user = await context.auth.ensureSession();
    if (!user) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirectTo: '/',
        },
      });
    }
  },
});
