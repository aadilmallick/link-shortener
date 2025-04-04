import { blue } from "jsr:@std/fmt@0.221/colors";
import { getCurrentUser } from "./auth.ts";
import { User } from "./databaseController.ts";
import { Router } from "./Router.ts";

type AppState = {
  currentUser: null | User;
};

export const app = new Router<AppState, AppState>(
  {
    currentUser: null,
  },
  {
    currentUser: null,
  }
);

export const userAuthMiddleware = app.produceGlobalMiddleware(
  async (_state, req) => {
    const currentUser = await getCurrentUser(req);
    console.log(blue("middleware running"));
    console.log("current user", currentUser);
    return {
      currentUser: currentUser,
    };
  }
);

export const userAuthLocalMiddleware = app.produceLocalMiddleware(
  async (_state, req) => {
    const currentUser = await getCurrentUser(req);
    console.log(blue("local middleware running"));
    console.log("current user", currentUser);
    return {
      currentUser: currentUser,
    };
  }
);
