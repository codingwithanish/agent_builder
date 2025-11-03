#!/bin/bash

# Script to create AWS Lambda deployment package for General Query Agent

echo "Creating deployment package for General Query Agent..."

# Create a temporary directory for packaging
PACKAGE_DIR="package"
mkdir -p $PACKAGE_DIR

# Copy Lambda function
cp lambda_function.py $PACKAGE_DIR/

# Copy agent schema
cp agent-schema.json $PACKAGE_DIR/

# If there are dependencies, install them (currently none)
if [ -f requirements.txt ] && [ -s requirements.txt ]; then
    pip install -r requirements.txt -t $PACKAGE_DIR/
fi

# Create ZIP file
cd $PACKAGE_DIR
zip -r ../general-query-agent.zip .
cd ..

# Clean up
rm -rf $PACKAGE_DIR

echo "Deployment package created: general-query-agent.zip"
echo ""
echo "This ZIP file can be uploaded to AWS Lambda."
echo ""
echo "Next steps:"
echo "1. Upload general-query-agent.zip to AWS Lambda"
echo "2. Set environment variable MCP_SERVER_PATH to point to your MCP server"
echo "3. Create Bedrock Agent and link to this Lambda function"
echo "4. Upload agent-schema.json as the action group schema"
