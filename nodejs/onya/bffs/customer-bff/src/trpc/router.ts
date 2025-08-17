import { router } from './trpc';
import { chatRouter } from './routers/chatRouter';
import { escalationRouter } from './routers/escalationRouter';

export const appRouter = router({
  chat: chatRouter,
  escalation: escalationRouter,
});

export type AppRouter = typeof appRouter;