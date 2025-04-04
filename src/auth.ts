import { createGitHubOAuthConfig, createHelpers } from "jsr:@deno/kv-oauth";
import { pick } from "jsr:@std/collections/pick";
import { type GitHubUser, getUser, storeUser } from "./databaseController.ts";
import { bgBlue } from "jsr:@std/fmt@0.221/colors";
import { githubAuth } from "./DenoOAuth.ts";

// // reads the GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET from the environment variables to create OAuth config
// const oauthConfig = createGitHubOAuthConfig();
// // helpers for handling OAuth flow
// const { handleCallback, getSessionId } = createHelpers(oauthConfig);

// this function is used to get the current user from the request
// it uses the session ID to fetch the user data from the database
export async function getCurrentUser(req: Request) {
  const sessionId = await githubAuth.getSessionId(req);
  console.log("sessionis", bgBlue(sessionId || "no session"));
  return sessionId ? await getUser(sessionId) : null;
}

// this function gets user data from GitHub and stores it in the database
export async function handleGithubCallback(req: Request) {
  const response = await githubAuth.onGithubCallback(
    req,
    async (sessionId, userData) => {
      await storeUser(sessionId, userData);
    }
  );
  // const { response, tokens, sessionId } = await handleCallback(req);
  // const userData = await getGitHubProfile(tokens?.accessToken);
  // const filteredData = pick(userData, ["avatar_url", "html_url", "login"]);
  // await storeUser(sessionId, filteredData);
  return response;
}
