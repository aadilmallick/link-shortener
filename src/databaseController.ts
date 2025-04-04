import { KVDB } from "./DenoKV.ts";
import { GoogleUser } from "./DenoOAuth.ts";

/**
 * Data model:
 *
 * Every shortlink is attached to a user via the userId, and uniquely represented by the shortCode.
 *
 * Every user is uniquely identified by its userId, which is the sessionId from the GitHub OAuth flow. They
 * also connect to the shortlinks they created by storing an array of shortCodes in the user object.
 */

export type ShortLink = {
  shortCode: string;
  longUrl: string;
  createdAt: number;
  userId: string;
  clickCount: number;
  lastClickEvent?: string;
};

export const kvdb = await KVDB.init();

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface User {
  userId: string;
  shortCodes: string[];
  type: "github" | "google";
}
const sessionsTable = kvdb.getTable<[string], GitHubUser | GoogleUser>(
  "sessions"
);
const usersTable = kvdb.getTable<[string], User>("users");

export async function storeUser(
  sessionId: string,
  userData: GitHubUser | GoogleUser
) {
  await sessionsTable.set([sessionId], userData);
  // google user
  if ("name" in userData) {
    await usersTable.set([sessionId], {
      userId: sessionId,
      shortCodes: [],
      type: "google",
    });
  } else {
    await usersTable.set([sessionId], {
      userId: sessionId,
      shortCodes: [],
      type: "github",
    });
  }
}

export async function getUserById(userId: string) {
  const res = await sessionsTable.get([userId]);
  return res.value;
}

export async function getUser(sessionId: string) {
  const res = await usersTable.get([sessionId]);
  return res.value;
}

export async function storeShortLink(
  longUrl: string,
  shortCode: string,
  userId: string
) {
  const data: ShortLink = {
    shortCode,
    longUrl,
    userId,
    createdAt: Date.now(),
    clickCount: 0,
  };

  // store the short link
  await kvdb.set(["shortLink", shortCode], data);

  // store short link on user end
  const user = await getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }
  await usersTable.set([userId], {
    ...user,
    userId: user?.userId,
    shortCodes: [...new Set([...user.shortCodes, shortCode])],
  });

  return data;
}

export async function getShortLink(shortCode: string) {
  const link = await kvdb.get<ShortLink>(["shortLink", shortCode]);
  return link.value;
}

export async function getLinksForUser(userId: string) {
  const user = await getUser(userId);
  if (!user) {
    return null;
  }
  const shortCodes = user.shortCodes;
  const links = [
    ...new Set(
      await Promise.all(shortCodes.map((shortCode) => getShortLink(shortCode)))
    ),
  ];
  return links as ShortLink[];
}

export async function deleteShortLink(shortCode: string) {
  await kvdb.delete(["shortLink", shortCode]);
}

export async function incrementClickCount(shortCode: string) {
  const link = await getShortLink(shortCode);
  if (!link) {
    throw new Error("Short link not found");
  }
  link.clickCount++;
  await kvdb.set(["shortLink", shortCode], link);
}
