#!/bin/bash

# Build script for Sharp Lambda Layer
# This creates a Lambda layer with Sharp compiled for AWS Lambda environment

set -e

echo "Building Sharp Lambda Layer..."

# Clean up
rm -rf nodejs
mkdir -p nodejs

# Create package.json for the layer
cat > nodejs/package.json <<EOF
{
  "name": "sharp-layer",
  "version": "1.0.0",
  "dependencies": {
    "sharp": "^0.33.1"
  }
}
EOF

# Install sharp with platform-specific binaries for Lambda
cd nodejs
npm install --platform=linux --arch=x64 --libc=glibc sharp
cd ..

echo "Sharp layer built successfully!"
echo "The layer is ready in the nodejs/ directory"