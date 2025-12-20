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
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{css}</style>
      </head>
      <body class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <nav class="bg-gray-900/50 backdrop-blur-lg border-b border-purple-500/30 sticky top-0 z-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center space-x-8">
                <a href="/" class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent hover:from-purple-300 hover:to-pink-500 transition-all duration-300">
                  🔗 LinkShort
                </a>
                <div class="hidden md:flex space-x-4">
                  <a href="/" class="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-purple-500/20 transition-all duration-200">
                    Home
                  </a>
                  <a href="/links" class="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-purple-500/20 transition-all duration-200">
                    Your Links
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
        {props.children}
      </body>
    </html>
  );
};

export const HomePage = ({ user }: { user: User | null }) => {
  return (
    <Layout>
      <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-4xl">
          {user ? <CreateShortlinkPage user={user} /> : <UnauthenticatedPage />}
        </div>
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
      <div class="flex items-center gap-6 mb-8">
        <div class="w-20 h-20 rounded-full overflow-hidden ring-4 ring-purple-500/50 shadow-lg shadow-purple-500/30">
          <img src={user.data.profilePictureUrl} alt="User profile" class="w-full h-full object-cover" />
        </div>
        <div>
          <h1 class="text-4xl font-bold text-white mb-2">Hello, {user.name}!</h1>
          <p class="text-purple-300">Manage your shortened links below</p>
        </div>
      </div>
    ) : (
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">Hello, {user.data.username}!</h1>
        <p class="text-purple-300">Manage your shortened links below</p>
      </div>
    );

  return (
    <Layout>
      <div class="min-h-[calc(100vh-4rem)] px-4 py-8">
        <div class="max-w-7xl mx-auto">
          {header()}
          {links.length === 0 ? (
            <div class="text-center py-16">
              <div class="text-6xl mb-4">🔗</div>
              <h2 class="text-2xl font-bold text-white mb-2">No links yet</h2>
              <p class="text-gray-400 mb-6">Create your first short link to get started!</p>
              <a href="/" class="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Create Link
              </a>
            </div>
          ) : (
            <div class="grid gap-4">
              {links.map((link) => (
                <div key={link.shortCode} class="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 transform hover:-translate-y-1">
                  <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div class="flex-1 space-y-3">
                      <div>
                        <p class="text-sm text-gray-400 mb-1">Original URL</p>
                        <a href={link.longUrl} target="_blank" class="text-purple-400 hover:text-purple-300 break-all font-medium transition-colors">
                          {link.longUrl}
                        </a>
                      </div>
                      <div>
                        <p class="text-sm text-gray-400 mb-1">Short URL</p>
                        <a
                          href={`${serverUrl}/${link.shortCode}`}
                          target="_blank"
                          class="text-pink-400 hover:text-pink-300 font-semibold transition-colors inline-flex items-center gap-2"
                        >
                          {`${serverUrl}/${link.shortCode}`}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <div class="flex md:flex-col items-center md:items-end gap-4 md:gap-3">
                      <div class="flex items-center gap-4 text-right">
                        <div class="bg-purple-500/20 px-4 py-2 rounded-lg border border-purple-500/30">
                          <p class="text-xs text-purple-300 mb-1">Clicks</p>
                          <p class="text-2xl font-bold text-white">{link.clickCount}</p>
                        </div>
                        <div class="bg-gray-700/50 px-4 py-2 rounded-lg">
                          <p class="text-xs text-gray-400 mb-1">Created</p>
                          <p class="text-sm text-white whitespace-nowrap">{new Date(link.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <form action={`/links/delete/${link.shortCode}`} method="POST">
                        <button type="submit" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg border border-red-500/30 hover:border-red-500/60 transition-all duration-200 font-medium">
                          🗑️ Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const UnauthenticatedPage = () => {
  return (
    <div class="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-purple-500/30 shadow-2xl shadow-purple-500/20">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">🚀</div>
        <h2 class="text-4xl font-bold text-white mb-4">Welcome to LinkShort</h2>
        <p class="text-lg text-gray-300 max-w-md mx-auto">
          The fastest way to shorten your links and track their performance. Sign in to get started!
        </p>
      </div>
      <div class="space-y-4 max-w-sm mx-auto">
        <a href="/oauth/signin" class="group block w-full px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-gray-600 hover:border-gray-500">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Sign in with GitHub</span>
          </div>
        </a>
        <a href="/oauth/google/signin" class="group block w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Sign in with Google</span>
          </div>
        </a>
      </div>
      <div class="mt-8 pt-8 border-t border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div class="text-3xl mb-2">⚡</div>
            <h3 class="text-white font-semibold mb-1">Lightning Fast</h3>
            <p class="text-sm text-gray-400">Shorten URLs in seconds</p>
          </div>
          <div>
            <div class="text-3xl mb-2">📊</div>
            <h3 class="text-white font-semibold mb-1">Track Clicks</h3>
            <p class="text-sm text-gray-400">Monitor link performance</p>
          </div>
          <div>
            <div class="text-3xl mb-2">🔒</div>
            <h3 class="text-white font-semibold mb-1">Secure</h3>
            <p class="text-sm text-gray-400">Your data is protected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function CreateShortlinkPage({ user }: { user: User }) {
  return (
    <div class="space-y-6">
      <div class="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/20">
        <div class="mb-6">
          <h2 class="text-3xl font-bold text-white mb-2">Create a New Shortlink</h2>
          <p class="text-gray-400">Transform your long URLs into short, shareable links</p>
        </div>
        <form action="/links" method="POST" class="space-y-4">
          <div>
            <label for="longUrl" class="block text-sm font-medium text-gray-300 mb-2">
              Enter your long URL
            </label>
            <input
              type="url"
              name="longUrl"
              id="longUrl"
              required
              placeholder="https://example.com/your-very-long-url-here"
              class="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button 
            type="submit" 
            class="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Create Shortlink
          </button>
        </form>
      </div>
      <div class="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-400">Signed in as</p>
            <p class="text-white font-medium">{"name" in user ? user.name : user.data.username}</p>
          </div>
        </div>
        {user.type === "github" ? (
          <a href="/oauth/signout" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg border border-red-500/30 hover:border-red-500/60 transition-all duration-200 font-medium">
            Logout
          </a>
        ) : (
          <a href="/oauth/google/signout" class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg border border-red-500/30 hover:border-red-500/60 transition-all duration-200 font-medium">
            Logout
          </a>
        )}
      </div>
    </div>
  );
}
