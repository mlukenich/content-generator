# NovaContent - User & Developer Guide

## 1. Introduction

Welcome to NovaContent, an automated AI video generation and publishing application. This guide provides all the necessary information for users and developers to understand, use, and contribute to the project.

NovaContent is designed to automatically generate short-form videos from a given topic, also known as a niche. It leverages the power of AI to create video scripts, generate voiceovers, and produce engaging videos with captions and background music. The application is built with a scalable architecture, allowing it to handle multiple video rendering jobs in parallel.

## 2. Features

- **Automated Video Generation:** Automatically creates videos from a given topic.
- **AI-Powered Scripting:** Uses AI to generate video scripts.
- **Text-to-Speech Voiceovers:** Generates high-quality voiceovers from the script.
- **Dynamic Video Composition:** Uses Remotion to create dynamic and engaging videos.
- **Caption Generation:** Automatically generates captions for the videos.
- **Background Music:** Adds background music to the videos.
- **Scalable Architecture:** Uses a queue-based system to handle multiple video rendering jobs in parallel.
- **Extensible Platform:** Can be extended to support different social media platforms.
- **Dockerized Environment:** Comes with a Dockerized environment for easy setup and deployment.

## 3. Architecture

NovaContent is a multi-container Docker application with the following services:

- **`db`:** A PostgreSQL database service for storing application data.
- **`cache`:** A Redis service for caching and message queuing.
- **`app`:** The main application service, which provides a web interface for managing the application and an API for interacting with the system.
- **`worker`:** A background worker service that processes video rendering jobs from the queue.

The application follows a queue-based architecture. When a new video generation request is received, it is added to a queue. The `worker` services pick up jobs from the queue and process them. This allows for a scalable and resilient system that can handle a large number of video rendering requests.

## 4. Getting Started

To get started with NovaContent, you will need to have Docker and Docker Compose installed on your machine.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/novacontent.git
    cd novacontent
    ```

2.  **Create a `.env` file:**

    Create a `.env` file in the root of the project and add the following environment variables:

    ```
    POSTGRES_USER=your-postgres-user
    POSTGRES_PASSWORD=your-postgres-password
    POSTGRES_DB=your-postgres-db
    GEMINI_API_KEY=your-gemini-api-key
    ELEVENLABS_API_KEY=your-elevenlabs-api-key
    ```

3.  **Build and run the application:**

    ```bash
    docker-compose up --build -d
    ```

    This will build the Docker images and start all the services in detached mode.

4.  **Access the application:**

    The main application is accessible at `http://localhost:3000`.

## 5. Project Structure

The project is organized into the following directories:

- **`src`**: Contains the source code of the application.
  - **`config`**: Contains configuration files, like niche definitions.
  - **`core`**: Contains core functionalities like queuing, schemas, and types.
  - **`db`**: Contains database-related files, like connection and schema.
  - **`platforms`**: Contains code for interacting with external platforms.
  - **`remotion`**: Contains files related to video generation using Remotion.
  - **`services`**: Contains services that encapsulate business logic.
  - **`test`**: Contains test files.
  - **`workers`**: Contains background workers.
  - **`index.ts`**: The entry point of the application.
- **`public`**: Contains public assets like music and voiceovers.
- **`docker-compose.yml`**: Defines the multi-container Docker application.
- **`Dockerfile`**: Defines the Docker image for the application.
- **`package.json`**: Lists the project's dependencies and scripts.

## 6. Key Components

### 6.1. AI Services

- **`GeminiService.ts`**: Interacts with the Google Gemini API to generate video scripts.
- **`AudioService.ts`**: Interacts with the ElevenLabs API to generate voiceovers.

### 6.2. Video Generation

- **`VideoService.ts`**: Orchestrates the video generation process.
- **`remotion` directory**: Contains the Remotion components used to create the videos.

### 6.3. Queuing

- **`QueueService.ts`**: Manages the video generation queue.
- **`render-worker.ts`**: The worker that processes video rendering jobs.

### 6.4. Database

- **`db/schema.ts`**: Defines the database schema using Drizzle ORM.
- **`db/connection.ts`**: Manages the connection to the PostgreSQL database.

## 7. How to Contribute

We welcome contributions to NovaContent! To contribute, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix.
3.  **Make your changes** and commit them with a clear and descriptive commit message.
4.  **Push your changes** to your fork.
5.  **Create a pull request** to the main repository.

Please make sure to follow the existing code style and conventions. If you are adding a new feature, please also add tests for it.
