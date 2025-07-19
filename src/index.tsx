import { ComponentChildren } from "npm:preact";
import { User, ShortLink } from "./databaseController.ts";
import { FileManager } from "./FileManager.ts";
import { GoogleUser } from "./DenoOAuth.ts";

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
        <title>Link Shortener</title>
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
    <Layout>
      <div class="container">
        {user ? <CreateShortlinkPage user={user} /> : <UnauthenticatedPage />}
      </div>
    </Layout>
  );
};

export const LinksPage = ({
  links,
  user,
}: {
  links: ShortLink[];
  user: User;
}) => {
  const header = () =>
    "name" in user ? (
      <div class="header-user-info">
        <h1>Hello, {user.name}</h1>
        <div class="img-container">
          <img src={user.data.profilePictureUrl} alt="User profile" />
        </div>
      </div>
    ) : (
      <h1>Hello, {user.data.username}</h1>
    );

  return (
    <Layout>
      <div class="container">
        {header()}
        <ul class="links-list">
          {links.map((link) => (
            <li key={link.shortCode} class="link-item">
              <div class="link-info">
                <p>
                  Original URL:{" "}
                  <a href={link.longUrl} target="_blank">
                    {link.longUrl}
                  </a>
                </p>
                <p>
                  Short URL:{" "}
                  <a
                    href={`${serverUrl}/${link.shortCode}`}
                    target="_blank"
                  >{`${serverUrl}/${link.shortCode}`}</a>
                </p>
              </div>
              <div class="link-stats">
                <p>Clicks: {link.clickCount}</p>
                <p>Created: {new Date(link.createdAt).toLocaleDateString()}</p>
                <form action={`/links/delete/${link.shortCode}`} method="POST">
                  <button type="submit" class="delete-button">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
};

const UnauthenticatedPage = () => {
  return (
    <div class="auth-container">
      <h2>Welcome to the URL Shortener</h2>
      <p>Please sign in to continue</p>
      <div class="auth-buttons">
        <a href="/oauth/signin" class="sign-in-github">
          Sign in with GitHub
        </a>
        <a href="/oauth/google/signin" class="sign-in-github">
          Sign in with Google
        </a>
      </div>
    </div>
  );
};

function CreateShortlinkPage({ user }: { user: User }) {
  return (
    <div class="form-container">
      <h2>Create a New Shortlink</h2>
      <form action="/links" method="POST" class="link-form">
        <input
          type="url"
          name="longUrl"
          required
          placeholder="https://example.com/your-long-url"
        />
        <button type="submit" class="button">
          Create Shortlink
        </button>
      </form>
      {user.type === "github" ? (
        <a href="/oauth/signout" class="logout-button">
          Logout of Github
        </a>
      ) : (
        <a href="/oauth/google/signout" class="logout-button">
          Logout of Google
        </a>
      )}
    </div>
  );
}
