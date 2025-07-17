# Repurposer Backend

This is the backend application for the Repurposer project, built with Node.js, Express, and TypeScript. It provides API endpoints for user authentication and content transcription/generation.

## Features

- User registration and login with JWT authentication
- Secure password hashing using Argon2
- Content transcription and repurposing using OpenAI and Pollinations AI
- MongoDB integration with Mongoose for data storage
- CORS enabled for frontend integration

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- MongoDB instance (local or cloud-hosted)

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository_url>
    cd repurposer-be
    ```

2.  Install dependencies:

    ```bash
    npm install
    # or yarn install
    ```

### Environment Variables

Create a `.env` file in the root of the `repurposer-be` directory with the following variables:

```
MONGO_URL=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

-   `MONGO_URL`: Your MongoDB connection string (e.g., `mongodb://localhost:27017/repurposer`).
-   `PORT`: The port the server will run on (e.g., `5000`).
-   `JWT_SECRET`: A strong, random string for JWT token signing.
-   `OPENROUTER_API_KEY`: Your API key for OpenRouter (or OpenAI compatible API).

### Running the Development Server

```bash
npm run dev
# or yarn dev
```

The server will start on the specified `PORT` (default: 5000).

### Building for Production

```bash
npm run build
```

### Running Production Build

```bash
npm run start
```

## Project Structure

-   `src/controllers`: Business logic for API endpoints.
-   `src/middlewares`: Express middleware functions (e.g., authentication).
-   `src/models`: Mongoose schemas and models for database interaction.
-   `src/routes`: API route definitions.
-   `src/utils`: Utility functions (e.g., token generation, prompt building, AI service integration).

## Technologies Used

-   Node.js
-   Express.js
-   TypeScript
-   Mongoose
-   MongoDB
-   argon2
-   jsonwebtoken
-   axios
-   OpenAI (via OpenRouter)
-   Pollinations AI (fallback)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.