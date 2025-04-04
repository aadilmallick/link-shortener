import { generateShortCode } from "./src/Crypto.ts";
import {
  deleteShortLink,
  getLinksForUser,
  getShortLink,
  GitHubUser,
  incrementClickCount,
  storeShortLink,
  storeUser,
  User,
  getUserById,
} from "./src/databaseController.ts";
import { HomePage, LinksPage } from "./src/index.tsx";
import { render } from "npm:preact-render-to-string";
import {
  app,
  userAuthLocalMiddleware,
  userAuthMiddleware,
} from "./src/server.ts";
import { githubAuth, googleAuth } from "./src/DenoOAuth.ts";

app.get("/oauth/signin", async (req) => {
  return await githubAuth.signIn(req);
});
app.get("/oauth/signout", async (req) => {
  return await githubAuth.signOut(req);
});
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
app.get("/oauth/google/signout", async (req) => {
  return await googleAuth.signOut(req);
});
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
  const user = currentUser?.userId
    ? await getUserById(currentUser?.userId)
    : null;
  const html = render(
    HomePage({
      user,
    })
  );
  return new Response(html, {
    headers: {
      "content-type": "text/html",
    },
  });
});

app.serveStatic("/public");

// page to see all links of current user
app.getWithLocalMiddleware("/links", [userAuthLocalMiddleware], async (req) => {
  const { currentUser } = app.getRequestPayload(req);

  if (!currentUser) {
    return app.redirect("/");
  }
  const user = (await getUserById(currentUser?.userId))!;
  const userLinks = await getLinksForUser(currentUser.userId);
  const html = render(
    LinksPage({
      user,
      links: userLinks || [],
    })
  );
  return app.renderHTML(html, 200);
});

// app.deleteWithLocalMiddleware(
//   "/links/:id",
//   [userAuthLocalMiddleware],
//   async (_req, _info, params) => {
//     const shortCode = (params as unknown as { id: string })?.id;
//     await deleteShortLink(shortCode);
//     return app.json({ message: "Short link deleted" }, 200);
//   }
// );

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

app.initServer();
