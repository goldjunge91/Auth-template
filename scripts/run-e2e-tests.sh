#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
PORT=3000
# Use localhost for BASE_URL as tests run inside the Codespace
export BASE_URL="http://localhost:3000" 
# HEALTH_CHECK_URL="${BASE_URL}/api/health" # Assuming you have a health check endpoint
HEALTH_CHECK_URL="${BASE_URL}/" # Or just check the base URL
MAX_RETRIES=5
RETRY_INTERVAL=5 # seconds
APP_START_TIMEOUT=60 # seconds for the app to start

# --- Cleanup Function ---
cleanup() {
  echo "Performing cleanup..."
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping dev server (PID: $SERVER_PID)..."
    kill $SERVER_PID || echo "Failed to kill server PID: $SERVER_PID. It might have already stopped."
    wait $SERVER_PID 2>/dev/null || true
  fi
  echo "Cleanup complete."
}

trap cleanup EXIT

# --- Start Application ---
echo "Starting application on port $PORT..."
# Ensure pnpm is available
if ! command -v pnpm &> /dev/null
then
    echo "pnpm could not be found, please install it first."
    exit 1
fi

# Start the dev server in the background
pnpm run dev --port $PORT &
SERVER_PID=$!
echo "Dev server started with PID: $SERVER_PID"
echo "Waiting for application to be ready at $HEALTH_CHECK_URL..."

# --- Wait for Application ---
# Wait for the application to be ready
# Simple wait, replace with a proper health check if available
sleep 15 # Give it some time to start

# More robust health check (optional, uncomment if you have a health endpoint)
# attempt_counter=0
# while ! curl --output /dev/null --silent --head --fail "$HEALTH_CHECK_URL"; do
#     if [ ${attempt_counter} -ge ${MAX_RETRIES} ];then
#         echo "Max retries reached. Application not responding at $HEALTH_CHECK_URL."
#         exit 1
#     fi
#     printf '.'
#     attempt_counter=$(($attempt_counter+1))
#     sleep $RETRY_INTERVAL
# done
# echo "Application is ready."


# --- Run Puppeteer Tests with Xvfb ---
echo "Running Puppeteer E2E tests with Xvfb..."
# Use xvfb-run to handle the X server environment
# --auto-servernum: Chooses a free server number
# --server-args: Arguments for the Xvfb server
xvfb-run --auto-servernum --server-args="-screen 0 1280x1024x16" pnpm run test:puppeteer:run

echo "E2E tests finished."

# Cleanup will be called automatically on exit
