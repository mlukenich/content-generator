# Testing Guide - AI Content Generation

## 1. Introduction

This guide will walk you through the process of setting up and testing the AI content generation features of the NovaContent application using Docker Desktop. By following these instructions, you will be able to run the application in a local environment and test the entire workflow of generating a video from a given topic.

## 2. Prerequisites

Before you begin, make sure you have the following software installed on your machine:

- **Docker Desktop:** [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
- **Git:** [https://git-scm.com/downloads](https://git-scm.com/downloads)

## 3. Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/novacontent.git
    cd novacontent
    ```

2.  **Create a `.env` file:**

    Create a `.env` file in the root of the project. You can copy the `.env.example` file as a template:

    ```bash
    cp .env.example .env
    ```

    Now, open the `.env` file and fill in the required API keys and database credentials. You will need to get API keys from [Google AI](https://makersuite.google.com/) and [ElevenLabs](https://elevenlabs.io/).

    ```
    POSTGRES_USER=myuser
    POSTGRES_PASSWORD=mypassword
    POSTGRES_DB=novacontent
    GEMINI_API_KEY=your-gemini-api-key
    ELEVENLABS_API_KEY=your-elevenlabs-api-key
    ```

## 4. Running the Application

Once you have completed the setup steps, you can run the application using Docker Compose.

1.  **Start the application:**

    Open a terminal in the root of the project and run the following command:

    ```bash
    docker-compose up --build
    ```

    This command will build the Docker images for the `app` and `worker` services and start all the containers. You will see the logs from all the services in your terminal.

2.  **Verify the services are running:**

    Open Docker Desktop and you should see the `novacontent` application running with the `db`, `cache`, `app`, and `worker` services.

## 5. Testing AI Content Generation

Now that the application is running, you can test the AI content generation features. The application is designed to automatically generate content for a "niche" on a schedule. For testing purposes, we can manually trigger the content generation process.

1.  **Access the BullMQ Dashboard:**

    The BullMQ Dashboard allows you to monitor the queues and jobs in the system. You can access it at `http://localhost:3000/admin/queues`.

2.  **Trigger the Content Generation Job:**

    The `index.ts` file contains a simple Express server that exposes a `/trigger` endpoint for manually triggering the content generation for a niche.

    Open your web browser or use a tool like `curl` to send a GET request to `http://localhost:3000/trigger?niche=science`. This will add a new job to the `content-generation` queue.

    ```bash
    curl "http://localhost:3000/trigger?niche=science"
    ```

3.  **Monitor the Job in BullMQ Dashboard:**

    Go back to the BullMQ Dashboard. You should see a new job in the `content-generation` queue. The `render-worker` will pick up this job and start processing it.

4.  **Check the Logs:**

    In the terminal where you ran `docker-compose up`, you can monitor the logs of the `worker` service. You will see logs indicating that the worker is processing the job, generating the script, creating the voiceover, and rendering the video.

5.  **Check the Output:**

    Once the job is completed, the generated video will be saved in the `output` directory in the root of the project. You can open the `output` directory and you should find a new video file.

## 6. Troubleshooting

-   **`docker-compose up` fails:** Make sure Docker Desktop is running and that you are in the root directory of the project.
-   **API Key Errors:** Double-check that your API keys in the `.env` file are correct and have the necessary permissions.
-   **Job fails in BullMQ:** Check the logs of the `worker` service for any error messages. The error messages should provide a clue as to what went wrong.
-   **Video not generated:** Make sure the `output` directory has the correct permissions.

Congratulations! You have successfully tested the AI content generation features of the NovaContent application.
