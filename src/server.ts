import { blue } from "jsr:@std/fmt@0.221/colors";
import { getCurrentUser } from "./auth.ts";
import { User } from "./databaseController.ts";
import { Router } from "./Router.ts";

type AppState = {
  currentUser: null | User;
};

export const app = new Router<
  AppState,
  {
    currentUser: null | User;
    sessionId: string | null;
  }
>(
  {
    currentUser: null,
  },
  {
    currentUser: null,
    sessionId: null as string | null,
  }
);

export const userAuthMiddleware = app.produceGlobalMiddleware(
  async (_state, req) => {
    const data = await getCurrentUser(req);
    console.log(blue("global middleware running"));
    console.log("current user", data?.user);
    return {
      currentUser: data?.user,
    };
  }
);

export const userAuthLocalMiddleware = app.produceLocalMiddleware(
  async (_state, req) => {
    const currentUser = await getCurrentUser(req);
    console.log(blue("local middleware running"));
    console.log("current user", currentUser);
    if (!currentUser) {
      return {
        currentUser: null,
        sessionId: null,
      };
    }
    return {
      currentUser: currentUser.user,
      sessionId: currentUser.sessionId,
    };
  }
);

export async function tryOperationSucceeded(cb: () => Promise<void>) {
  try {
    await cb();
    return true;
  } catch (error) {
    console.error("Error in operation", error);
    return false;
  }
}
