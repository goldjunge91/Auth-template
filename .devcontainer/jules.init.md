#!/bin/bash

echo "Starting Jules Node.js project setup..."

# The project has been cloned into /app, so set the project directory accordingly.
PROJECT_DIR="/app"

# Navigate to the project directory.
# Using '|| { ...; exit 1; }' for robust error handling.
cd "$PROJECT_DIR" || { echo "Error: Project directory $PROJECT_DIR not found. Exiting."; exit 1; }

echo "Successfully navigated to project directory: $(pwd)"

# Check if pnpm is installed globally. If not, install it.
if ! command -v pnpm &> /dev/null
then
    echo "pnpm not found, installing globally via npm..."
    npm install -g pnpm || { echo "Error: Failed to install pnpm globally. Exiting."; exit 1; }
else
    echo "pnpm is already installed."
fi

# Install project dependencies using pnpm.
echo "Installing project dependencies with pnpm..."
pnpm install || { echo "Error: pnpm install failed. Exiting."; exit 1; }

# Run database commands (if applicable to your project).
# These commands are commented out in your original example,
# but included here for completeness if your project needs them.
# Uncomment them if 'Auth-template' requires database generation and migration.
# echo "Generating database schema and running migrations..."
# pnpm db:generate && pnpm db:migrate || { echo "Error: Database commands failed. Exiting."; exit 1; }

echo "Jules project setup completed successfully."
