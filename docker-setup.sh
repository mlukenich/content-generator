#!/bin/bash
#
# docker-setup.sh
#
# This script simplifies the process of building and running the NovaContent
# Docker environment. It ensures the '.env' file exists and then starts
# all services in detached mode.
#

# Check if the .env file exists. If not, copy the example.
if [ ! -f .env ]; then
    echo "INFO: .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "IMPORTANT: Please update the API keys in the newly created .env file."
    exit 1
fi

echo "Starting Docker services..."

# Build and run the services in detached mode
docker-compose up --build -d

echo "Docker services started."
echo "Monitor queues at: http://localhost:3000/admin/queues"
