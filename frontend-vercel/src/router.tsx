import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { authHelpers } from "./lib/auth";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    // Auth + Firestore helpers are exposed to every route through this
    // context (see beforeLoad guards and useRouteContext callers).
    context: { queryClient, auth: authHelpers },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
