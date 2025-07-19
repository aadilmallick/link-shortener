# Link Shortener

This is a simple link shortener application built with Deno, Preact, and TypeScript. It allows users to shorten long URLs and manage their shortened links.

## Functionality

-   **User Authentication**: Users can sign in with their GitHub or Google accounts to manage their links.
-   **Link Shortening**: Authenticated users can create short links for their long URLs.
-   **Link Management**: Users can view a list of their shortened links, see how many times each link has been clicked, and delete links they no longer need.
-   **Redirection**: The shortened links redirect to the original long URLs.

## Project Structure

The project is organized into the following directories and files:

-   **`src/`**: Contains the source code for the application.
    -   **`index.tsx`**: The main Preact component that renders the application's UI.
    -   **`style.css`**: The stylesheet for the application.
    -   **`server.ts`**: The Deno server that handles HTTP requests.
    -   **`auth.ts`**: Handles user authentication with GitHub and Google.
    -   **`databaseController.ts`**: Manages the application's data, such as users and links.
    -   **`DenoKV.ts`**: A wrapper for Deno's key-value store.
    -   **`DenoOAuth.ts`**: Handles the OAuth2 flow for authentication.
    -   **`FileManager.ts`**: A utility for reading files.
    -   **`Router.ts`**: A simple router for handling different routes.
    -   **`Crypto.ts`**: A utility for cryptographic operations.
    -   **`types.d.ts`**: Contains type definitions for the application.
-   **`main.ts`**: The entry point for the application.
-   **`deno.json`**: The configuration file for Deno.
-   **`deno.lock`**: The lock file for Deno dependencies.

## Application Flow

1.  **User visits the homepage**: The user is prompted to sign in with their GitHub or Google account.
2.  **User signs in**: The user is redirected to the respective authentication provider to authorize the application.
3.  **User is redirected back to the application**: The application creates a new user in the database and stores their information in a session.
4.  **User creates a short link**: The user enters a long URL and clicks the "Create Shortlink" button.
5.  **The application creates a short link**: The application generates a unique short code for the long URL and stores it in the database.
6.  **User views their links**: The user can see a list of their shortened links, along with the number of clicks for each link.
7.  **User deletes a link**: The user can delete a link by clicking the "Delete" button.
8.  **User logs out**: The user can log out of the application by clicking the "Logout" button.
9.  **User clicks a short link**: The application looks up the short link in the database and redirects the user to the original long URL.
