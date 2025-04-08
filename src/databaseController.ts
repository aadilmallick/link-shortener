import { KVDB } from "./DenoKV.ts";
import type { GoogleUser, GitHubUser } from "./DenoOAuth.ts";

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

export interface User {
  userId: string; // username or email will be key
  data: {
    username: string;
    email?: string;
    profilePictureUrl: string;
  };
  type: "github" | "google";
}

interface GoogleUserDB extends User {
  type: "google";
}

interface GithubUserDB extends User {
  type: "github";
}

function validateUser(user: GoogleUser | GitHubUser): User {
  if ("name" in user) {
    return {
      type: "google",
      data: {
        username: user.name,
        email: user.email,
        profilePictureUrl: user.picture,
      },
      userId: user.email || user.name,
    } as GoogleUserDB;
  } else {
    return {
      type: "github",
      data: {
        username: user.login,
        email: undefined,
        profilePictureUrl: user.avatar_url,
      },
      userId: user.login,
    } as GithubUserDB;
  }
}

/* 

  Sessions table stores the current sessionId as key, and as value, stores userId.
  Users table stores the userId as key, and as value, stores the user data.

  Fetching a user:
    1. Fetch userId info from sessionsTable querying sessionId
    2. Fetch user data from usersTable querying userId

  Fetching a shortlink
    1. Fetch shortcode info from route, and then from shortLinksTable querying shortCode
  
  Fetching all shortlinks from user
    1. Fetch userId info from sessionsTable querying sessionId
    2. Fetch all shortlinks by querying under prefix ["users", userId]
*/

export const shortLinksTable = kvdb.getTable<[string], ShortLink>([
  "shortLink",
]);
export const usersTable = kvdb.getTable<[string], User>(["users"]);
export const sessionsTable = kvdb.getTable<
  [string],
  {
    userId: string;
  }
>(["sessions"]);

// await shortLinksTable.deleteTable();
// await usersTable.deleteTable();
// await sessionsTable.deleteTable();

export async function storeUser(
  sessionId: string,
  userData: GitHubUser | GoogleUser
) {
  const user = validateUser(userData);
  // 1. store ["sessions", sessionId] -> userId
  // 2. store ["users", userId] -> user
  const response = await kvdb.atomic([
    sessionsTable.produceSetAction([sessionId], { userId: user.userId }),
    usersTable.produceSetAction([user.userId], user),
  ]);
  console.log(response);
  // await sessionsTable.set([sessionId], { userId: user.userId });
  // await usersTable.set([user.userId], user);
}

export async function getUser(sessionId: string) {
  const session = await sessionsTable.get([sessionId]);
  if (!session.value) {
    return null;
  }
  console.log(session.value);
  const user = await usersTable.get([session.value.userId]);
  if (!user.value) {
    return null;
  }
  return user.value;
}

async function getUserDBData(sessionId: string) {
  // store short link on user end
  const user = await getUser(sessionId);
  if (!user) {
    throw new Error("User not found");
  }
  // store the short link
  const userLinksTable = kvdb.getTable<
    [string],
    {
      shortCode: string;
    }
  >(["users", user.userId]);
  return {
    user,
    userLinksTable,
  };
}

export async function storeShortLink(
  longUrl: string,
  shortCode: string,
  userId: string
) {
  // const { user, userLinksTable } = await getUserDBData(userId);
  const data: ShortLink = {
    shortCode,
    longUrl,
    userId: userId,
    createdAt: Date.now(),
    clickCount: 0,
  };
  // add shortlink like ["users", userId, shortCode] -> null
  // query shortlink from user by listin all keys under ["users", userId], then
  // fetch specific shortlink by ["shortLink", shortCode]

  const userLinksTable = kvdb.getTable<[string], { shortCode: string }>([
    "users",
    userId,
  ]);

  await kvdb.atomic([
    userLinksTable.produceSetAction([shortCode], {
      shortCode,
    }),
    shortLinksTable.produceSetAction([shortCode], data),
  ]);
  // await userLinksTable.set([shortCode], null);
  // await shortLinksTable.set([shortCode], data);
  return data;
}

export async function getShortLink(shortCode: string) {
  const link = await shortLinksTable.get([shortCode]);
  return link.value;
}

export async function getLinksForUser(userId: string) {
  const userLinksTable = kvdb.getTable<[string], { shortCode: string }>([
    "users",
    userId,
  ]);
  const shortCodes = await userLinksTable.getAll();
  const links = await shortLinksTable.getMany(
    shortCodes.map((shortCode) => [shortCode.value.shortCode])
  );
  return links;
}

export async function deleteShortLink(userId: string, shortCode: string) {
  const userLinksTable = kvdb.getTable<[string], { shortCode: string }>([
    "users",
    userId,
  ]);
  await kvdb.atomic([
    shortLinksTable.produceDeleteAction([shortCode]),
    userLinksTable.produceDeleteAction([shortCode]),
  ]);
}

export async function removeSessionId(sessionId: string) {
  await sessionsTable.delete([sessionId]);
}

export async function incrementClickCount(shortCode: string) {
  const link = await getShortLink(shortCode);
  if (!link) {
    throw new Error("Short link not found");
  }
  link.clickCount++;
  await shortLinksTable.set([shortCode], link);
  return link;
}
