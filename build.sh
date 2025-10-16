#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Install backend dependencies
pip install -r requirements.txt

# 2. Navigate to the frontend directory
cd frontend

# 3. Install frontend dependencies
npm install

# 4. Build the React application
npm run build

# 5. Navigate back to the root directory (optional, but good practice)
cd ..