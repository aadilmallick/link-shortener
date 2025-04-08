import { generateShortCode } from "./src/Crypto.ts";
import {
  deleteShortLink,
  getLinksForUser,
  getShortLink,
  incrementClickCount,
  storeShortLink,
  storeUser,
  User,
  usersTable,
  sessionsTable,
  removeSessionId,
} from "./src/databaseController.ts";
import { HomePage, LinksPage } from "./src/index.tsx";
import { render } from "npm:preact-render-to-string";
import {
  app,
  tryOperationSucceeded,
  userAuthLocalMiddleware,
  userAuthMiddleware,
} from "./src/server.ts";
import { githubAuth, googleAuth } from "./src/DenoOAuth.ts";

app.get("/oauth/signin", async (req) => {
  return await githubAuth.signIn(req);
});
app.getWithLocalMiddleware(
  "/oauth/signout",
  [userAuthLocalMiddleware],
  async (req) => {
    const { sessionId } = app.getRequestPayload(req);
    if (sessionId) {
      await removeSessionId(sessionId);
    }
    return await githubAuth.signOut(req);
  }
);
app.get(githubAuth.redirectUriPath, async (req: Request) => {
  const response = await githubAuth.onGithubCallback(
    req,
    async (sessionId, userData) => {
      await storeUser(sessionId, userData);
    }
  );
  return response;
});

app.get("/oauth/google/signin", async (req) => {
  return await googleAuth.signIn(req);
});
app.getWithLocalMiddleware(
  "/oauth/google/signout",
  [userAuthLocalMiddleware],
  async (req) => {
    const { sessionId } = app.getRequestPayload(req);
    if (sessionId) {
      await removeSessionId(sessionId);
    }

    return await googleAuth.signOut(req);
  }
);
app.get(googleAuth.redirectUriPath, async (req: Request) => {
  const response = await googleAuth.onGoogleCallback(
    req,
    async (sessionId, userData) => {
      await storeUser(sessionId, userData);
    }
  );
  return response;
});

app.getWithLocalMiddleware("/", [userAuthLocalMiddleware], async (req) => {
  const { currentUser } = app.getRequestPayload(req);
  const html = render(
    HomePage({
      user: currentUser,
    })
  );
  return app.renderHTML(html, 200);
});

app.serveStatic("/public");

// page to see all links of current user
app.getWithLocalMiddleware("/links", [userAuthLocalMiddleware], async (req) => {
  const { currentUser } = app.getRequestPayload(req);

  if (!currentUser) {
    return app.redirect("/");
  }

  const userLinks = await getLinksForUser(currentUser.userId);
  console.log("user links", userLinks);
  const html = render(
    LinksPage({
      user: currentUser,
      links: userLinks || [],
    })
  );
  return app.renderHTML(html, 200);
});

app.postWithLocalMiddleware(
  "/links/delete/:shortCode",
  [userAuthLocalMiddleware],
  async (req, info, _params) => {
    const shortCode = info?.pathname.groups["shortCode"] as string;

    const { currentUser } = app.getRequestPayload(req);

    if (!currentUser) {
      return app.json({ error: "Unauthorized" }, 401);
    }
    const success = await tryOperationSucceeded(async () => {
      await deleteShortLink(currentUser.userId, shortCode);
    });
    if (!success) {
      return app.json({ error: "Failed to delete short link" }, 500);
    }
    return app.redirect("/links");
  }
);

app.postWithLocalMiddleware(
  "/links",
  [userAuthLocalMiddleware],
  async (req) => {
    const { currentUser } = app.getRequestPayload(req);
    if (!currentUser) {
      return app.json({ error: "Unauthorized" }, 401);
    }
    const formData = await req.formData();
    const longUrl = formData.get("longUrl");
    if (!longUrl) {
      return app.json({ error: "Long URL is required" }, 400);
    }

    // create short link associated with the user
    const shortCode = await generateShortCode(longUrl as string);
    await storeShortLink(longUrl as string, shortCode, currentUser.userId);

    return app.redirect("/links");
  }
);

app.get("/:shortCode", async (req, info, _params) => {
  const shortCode = info?.pathname.groups["shortCode"] as string;
  const link = await getShortLink(shortCode);
  if (!link) {
    return app.text("Short link not found", 404);
  }

  // increment click count
  const ipAddress =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    "Unknown";
  const userAgent = req.headers.get("user-agent") || "Unknown";
  const country = req.headers.get("cf-ipcountry") || "Unknown";

  await incrementClickCount(shortCode);

  // await storeShortLink(link.longUrl, shortCode, link.userId);
  return app.redirect(link.longUrl);
});

app.get("/realtime/:id", async (_req, info, params) => {
  const shortCode = info?.pathname.groups["id"] as string;
  const response = await fetch("/public/bruh.png");
  const stream = response.body?.getReader();
  if (!stream) {
    return app.text("Stream not found", 404);
  }
  // Create stream response body
  const body = new ReadableStream({
    async start(controller) {
      // Fetch initial data if needed
      // const initialData = await getShortLink(shortCode);
      // controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ clickCount: initialData.clickCount })}\n\n`));

      while (true) {
        const { done, value } = await stream.read();
        if (done) {
          return;
        }
        const bits = value?.length;

        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              bits,
            })}\n\n`
          )
        );
        console.log("Stream updated");
      }
    },
    cancel() {
      stream.cancel();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

app.initServer();
