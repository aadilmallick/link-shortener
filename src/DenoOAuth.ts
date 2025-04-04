import {
  createGitHubOAuthConfig,
  createHelpers,
  Helpers,
} from "jsr:@deno/kv-oauth";
import { pick } from "jsr:@std/collections/pick";
import { createGoogleOAuthConfig } from "jsr:@deno/kv-oauth";

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GoogleUser {
  id: string;
  name: string;
  picture: string;
}

export class GitHubOAuth {
  #redirectUriPath: string;
  private oauthConfig: ReturnType<typeof createGitHubOAuthConfig>;
  constructor(redirectUri: string) {
    // reads the GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET from the environment variables to create OAuth config
    this.oauthConfig = createGitHubOAuthConfig({
      redirectUri,
    });
    this.#redirectUriPath = new URL(redirectUri).pathname;
    // helpers for handling OAuth flow
  }

  public get redirectUriPath() {
    return this.#redirectUriPath;
  }

  public async getSessionId(req: Request) {
    const { getSessionId } = createHelpers(this.oauthConfig);
    return await getSessionId(req);
  }

  /** 
  gets the session id of the currently logged in user, undefined otherwise.
  store this in your database.
  */

  private async getGitHubProfile(accessToken: string) {
    const response = await fetch("https://api.github.com/user", {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      response.body?.cancel();
      throw new Error("Failed to fetch GitHub user");
    }

    return response.json() as Promise<GitHubUser>;
  }

  /**this method should be the handler for the /oauth/callback route.
  `cb` is called with the sessionId and the user data.
  This is where you should store the user data in your database 
  */
  async onGithubCallback(
    req: Request,
    cb: (sessionId: string, user: GitHubUser) => void
  ) {
    const { handleCallback } = createHelpers(this.oauthConfig);
    const { response, tokens, sessionId } = await handleCallback(req);
    const userData = await this.getGitHubProfile(tokens?.accessToken);
    const filteredData = pick(userData, ["avatar_url", "html_url", "login"]);
    cb(sessionId, filteredData);
    return response;
  }

  /**this method should be the handler for the /oauth/signin route and
  it redirects the user to the GitHub OAuth page
  */
  signIn(req: Request) {
    const { signIn } = createHelpers(this.oauthConfig);
    return signIn(req);
  }

  /**  this method should be the handler for the /oauth/signout route.
   * It redirects the user to the GitHub OAuth page
   */
  signOut(req: Request) {
    const { signOut } = createHelpers(this.oauthConfig);
    return signOut(req);
  }
}

export class GoogleOAuth {
  #redirectUriPath: string;
  private oauthConfig: ReturnType<typeof createGoogleOAuthConfig>;

  constructor(redirectUri: string) {
    this.oauthConfig = createGoogleOAuthConfig({
      redirectUri,
      scope: "https://www.googleapis.com/auth/userinfo.profile",
    });
    this.#redirectUriPath = new URL(redirectUri).pathname;
  }

  public get redirectUriPath() {
    return this.#redirectUriPath;
  }

  private async getGoogleProfile(accessToken: string) {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      response.body?.cancel();
      throw new Error("Failed to fetch Google user");
    }
    const data = await response.json();
    console.log(data);
    return data as Promise<GoogleUser>;
  }

  /**this method should be the handler for the /oauth/signin route and
  it redirects the user to the GitHub OAuth page
  */
  signIn(req: Request) {
    const { signIn } = createHelpers(this.oauthConfig);
    return signIn(req);
  }

  /**  this method should be the handler for the /oauth/signout route.
   * It redirects the user to the GitHub OAuth page
   */
  signOut(req: Request) {
    const { signOut } = createHelpers(this.oauthConfig);
    return signOut(req);
  }

  async getSessionId(req: Request) {
    const { getSessionId } = createHelpers(this.oauthConfig);
    return await getSessionId(req);
  }

  /**this method should be the handler for the /oauth/callback route.
  `cb` is called with the sessionId and the user data.
  This is where you should store the user data in your database 
  */
  async onGoogleCallback(
    req: Request,
    cb: (sessionId: string, user: GoogleUser) => void
  ) {
    const { handleCallback } = createHelpers(this.oauthConfig);
    const { response, tokens, sessionId } = await handleCallback(req);
    const userData = await this.getGoogleProfile(tokens?.accessToken);
    const filteredData = pick(userData, ["id", "name", "picture"]);
    cb(sessionId, filteredData);
    return response;
  }
}

export const githubAuth = new GitHubOAuth(Deno.env.get("REDIRECT_URI")!);
export const googleAuth = new GoogleOAuth(Deno.env.get("REDIRECT_URI_GOOGLE")!);
