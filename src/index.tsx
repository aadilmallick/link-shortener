import { ComponentChildren } from "npm:preact";
import { GitHubUser, ShortLink, User } from "./databaseController.ts";
import { FileManager } from "./FileManager.ts";

const css = await FileManager.readFile(`${import.meta.dirname}/style.css`);
const serverUrl =
  Deno.env.get("MODE") === "production"
    ? Deno.env.get("SERVER_URL")
    : "http://localhost:8000";

const Layout = (props: { children: ComponentChildren }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
        <style>{css}</style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/links">Your Links</a>
        </nav>
        {props.children}
      </body>
    </html>
  );
};

export const HomePage = ({ user }: { user: User | null }) => {
  return (
    <Layout>{user ? <CreateShortlinkPage /> : <UnauthenticatedPage />}</Layout>
  );
};

export const LinksPage = ({
  links,
  user,
}: {
  links: ShortLink[];
  user: User;
}) => {
  return (
    <Layout>
      <h1>Hello user {user.userId}</h1>
      <ul>
        {links.map((link) => (
          <li key={link.shortCode} class="link-item">
            <div>
              <p>Click count: {link.clickCount}</p>
              <p>Created on: {new Date(link.createdAt).toDateString()}</p>
              <p>
                Long url:{" "}
                <a href={link.longUrl} target="_blank">
                  {link.longUrl}
                </a>
              </p>
              <p>
                Short url:{" "}
                <a
                  href={`${serverUrl}/${link.shortCode}`}
                  target="_blank"
                >{`${serverUrl}/${link.shortCode}`}</a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Layout>
  );
};

const UnauthenticatedPage = () => {
  return (
    <>
      <h2>Please sign in</h2>
      <a href="/oauth/signin" class="sign-in-github">
        Sign in with GitHub
      </a>
    </>
  );
};

function CreateShortlinkPage() {
  return (
    <>
      <h2>Create a New Shortlink</h2>
      <form action="/links" method="POST">
        <div>
          <label>
            <span>Long URL</span>
          </label>
          <input
            type="url"
            name="longUrl"
            required
            placeholder="https://example.com/your-long-url"
          />
        </div>
        <button type="submit">Create Shortlink</button>
      </form>
    </>
  );
}
