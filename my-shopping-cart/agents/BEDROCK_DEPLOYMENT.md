# AWS Bedrock Agent Core - Deployment Guide

This guide explains how to deploy the Payment Query Agent and General Query Agent to AWS Bedrock Agent Core.

## Architecture Overview

```
User Query
    ↓
AWS Bedrock Agent
    ↓
Lambda Function (Agent Handler)
    ↓
MCP Server (via subprocess)
    ↓
Product/Order Data
    ↓
Response back to User
```

### Key Components

1. **Bedrock Agent** - Handles natural language understanding and conversation
2. **Lambda Function** - Executes agent actions and calls MCP server
3. **MCP Server** - Provides data access for products and orders
4. **Action Groups** - Define API operations available to the agent

---

## Prerequisites

- AWS Account with Bedrock access
- AWS CLI configured
- Node.js runtime (for MCP server)
- Python 3.9+ (for Lambda functions)
- Basic knowledge of AWS Lambda and Bedrock

---

## Part 1: Prepare MCP Server

The agents need access to the MCP server to retrieve data.

### Option A: Bundle MCP Server with Lambda

1. **Create MCP server Layer**:
```bash
cd my-shopping-cart/mcp-tools/my-shopping-cart-mcp-server

# Install dependencies
npm install

# Create layer directory
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cp -r src layer/
cp package.json layer/

# Create ZIP
cd layer
zip -r ../../mcp-server-layer.zip .
cd ../..
```

2. **Upload to Lambda Layer**:
```bash
aws lambda publish-layer-version \
    --layer-name shopping-cart-mcp-server \
    --zip-file fileb://mcp-server-layer.zip \
    --compatible-runtimes nodejs18.x nodejs20.x \
    --description "Shopping Cart MCP Server"
```

### Option B: Deploy MCP Server Separately

Deploy MCP server as a separate Lambda function or EC2 instance and configure the agent Lambdas to call it via HTTP.

---

## Part 2: Deploy Payment Query Agent

### Step 1: Create Deployment Package

```bash
cd agents/payment-query-agent

# Run the deployment script
chmod +x create_deployment_package.sh
./create_deployment_package.sh
```

This creates `payment-query-agent.zip`.

### Step 2: Create Lambda Function

```bash
aws lambda create-function \
    --function-name payment-query-agent \
    --runtime python3.11 \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-bedrock-agent-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://payment-query-agent.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables="{MCP_SERVER_PATH=/opt/mcp-server/src/index.js,NODE_PATH=/opt/nodejs/bin/node}"
```

### Step 3: Attach MCP Server Layer

```bash
aws lambda update-function-configuration \
    --function-name payment-query-agent \
    --layers arn:aws:lambda:REGION:ACCOUNT_ID:layer:shopping-cart-mcp-server:VERSION
```

### Step 4: Create Bedrock Agent

1. Go to AWS Bedrock Console
2. Navigate to "Agents" → "Create Agent"
3. Configure:
   - **Name**: Payment Query Agent
   - **Description**: Handles payment-related customer queries
   - **Model**: Claude 3 Sonnet or Claude 3.5 Sonnet
   - **Instructions**:
     ```
     You are a helpful customer service agent specializing in payment-related queries.
     Help customers check payment status, get payment details, and understand refunds.
     Always be professional and empathetic when discussing payment issues.
     ```

### Step 5: Create Action Group

1. In the agent configuration, click "Add Action Group"
2. Configure:
   - **Name**: PaymentActions
   - **Description**: Actions for checking payment status and details
   - **Action group type**: Define with API schemas
   - **Lambda function**: Select `payment-query-agent`

3. Upload Schema:
   - Click "Upload schema"
   - Upload `agent-schema.json`

4. Save and test

---

## Part 3: Deploy General Query Agent

### Step 1: Create Deployment Package

```bash
cd agents/general-query-agent

# Run the deployment script
chmod +x create_deployment_package.sh
./create_deployment_package.sh
```

This creates `general-query-agent.zip`.

### Step 2: Create Lambda Function

```bash
aws lambda create-function \
    --function-name general-query-agent \
    --runtime python3.11 \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-bedrock-agent-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://general-query-agent.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables="{MCP_SERVER_PATH=/opt/mcp-server/src/index.js,NODE_PATH=/opt/nodejs/bin/node}"
```

### Step 3: Attach MCP Server Layer

```bash
aws lambda update-function-configuration \
    --function-name general-query-agent \
    --layers arn:aws:lambda:REGION:ACCOUNT_ID:layer:shopping-cart-mcp-server:VERSION
```

### Step 4: Create Bedrock Agent

1. Go to AWS Bedrock Console
2. Navigate to "Agents" → "Create Agent"
3. Configure:
   - **Name**: General Query Agent
   - **Description**: Handles product-related customer queries
   - **Model**: Claude 3 Sonnet or Claude 3.5 Sonnet
   - **Instructions**:
     ```
     You are a knowledgeable product specialist for TechStore.
     Help customers find products, compare options, check stock, and make informed decisions.
     Provide detailed product information and recommendations based on customer needs.
     ```

### Step 5: Create Action Group

1. In the agent configuration, click "Add Action Group"
2. Configure:
   - **Name**: ProductActions
   - **Description**: Actions for searching products and checking stock
   - **Action group type**: Define with API schemas
   - **Lambda function**: Select `general-query-agent`

3. Upload Schema:
   - Click "Upload schema"
   - Upload `agent-schema.json`

4. Save and test

---

## Part 4: IAM Role Configuration

The Lambda functions need proper IAM permissions.

### Create IAM Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Attach Policies

```bash
aws iam attach-role-policy \
    --role-name lambda-bedrock-agent-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
    --role-name lambda-bedrock-agent-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

---

## Part 5: Testing

### Test Payment Query Agent

1. Go to Bedrock Console → Agents → Payment Query Agent
2. Click "Test"
3. Try queries:
   - "What is the payment status of order ORD-2024-001?"
   - "Has John Doe paid for his order?"
   - "Show me all pending payments"

### Test General Query Agent

1. Go to Bedrock Console → Agents → General Query Agent
2. Click "Test"
3. Try queries:
   - "What laptops do you have?"
   - "Show me products under $300"
   - "Is the iPhone in stock?"
   - "Compare PROD001 and PROD002"

---

## Part 6: Agent Aliases and Deployment

### Create Agent Alias

```bash
# For Payment Query Agent
aws bedrock-agent create-agent-alias \
    --agent-id AGENT_ID \
    --agent-alias-name production \
    --description "Production version of Payment Query Agent"

# For General Query Agent
aws bedrock-agent create-agent-alias \
    --agent-id AGENT_ID \
    --agent-alias-name production \
    --description "Production version of General Query Agent"
```

---

## Part 7: Integration Options

### Option 1: Direct API Calls

```python
import boto3

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

response = bedrock_agent_runtime.invoke_agent(
    agentId='YOUR_AGENT_ID',
    agentAliasId='YOUR_ALIAS_ID',
    sessionId='unique-session-id',
    inputText='What is the payment status of order ORD-2024-001?'
)
```

### Option 2: Via AWS SDK

```javascript
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const command = new InvokeAgentCommand({
  agentId: "YOUR_AGENT_ID",
  agentAliasId: "YOUR_ALIAS_ID",
  sessionId: "unique-session-id",
  inputText: "Show me laptops under $2000"
});

const response = await client.send(command);
```

### Option 3: Via Web Application

Integrate with your web app using AWS Amplify or direct SDK calls.

---

## Troubleshooting

### Lambda Timeout Issues

If Lambda times out when calling MCP server:
- Increase Lambda timeout (max 15 minutes)
- Optimize MCP server response time
- Add caching layer

### MCP Server Not Found

If Lambda can't find MCP server:
- Verify `MCP_SERVER_PATH` environment variable
- Check Lambda layer is attached
- Verify Node.js runtime is available

### Permission Errors

If Lambda can't invoke:
- Check IAM role has `bedrock:InvokeAgent` permission
- Verify Lambda execution role
- Check resource policies

### Agent Not Calling Lambda

If Bedrock agent doesn't call Lambda:
- Verify action group schema is valid
- Check Lambda function name matches
- Test Lambda function independently
- Review CloudWatch logs

---

## Monitoring and Logging

### CloudWatch Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/payment-query-agent --follow
aws logs tail /aws/lambda/general-query-agent --follow
```

### Metrics to Monitor

- Lambda invocations
- Lambda duration
- Lambda errors
- Bedrock agent invocations
- Bedrock agent errors

### Set Up Alarms

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name payment-agent-errors \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=FunctionName,Value=payment-query-agent
```

---

## Cost Optimization

### Lambda Costs
- Use appropriate memory size (512 MB recommended)
- Set reasonable timeout (30 seconds)
- Enable provisioned concurrency only if needed

### Bedrock Costs
- Choose appropriate model (Claude 3 Sonnet for balance)
- Use agent aliases to version models
- Monitor token usage

### Data Transfer
- Deploy in same region as Bedrock
- Use VPC endpoints if possible

---

## Security Best Practices

1. **Use Secrets Manager** for any API keys
2. **Enable VPC** for Lambda if accessing private resources
3. **Use least privilege** IAM policies
4. **Enable CloudTrail** for audit logging
5. **Encrypt** environment variables
6. **Use WAF** if exposing via API Gateway

---

## Next Steps

1. ✅ Deploy both agents to Bedrock
2. ✅ Test with sample queries
3. ✅ Create production aliases
4. Integrate with your application
5. Set up monitoring and alerts
6. Implement conversation memory
7. Add more action groups as needed

---

## Support and Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Bedrock Agents Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Lambda Python Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)

---

## File Structure Summary

```
agents/
├── payment-query-agent/
│   ├── lambda_function.py           # Lambda handler
│   ├── agent-schema.json            # Bedrock action group schema
│   ├── requirements.txt             # Python dependencies
│   ├── create_deployment_package.sh # Build script
│   └── payment-query-agent.zip      # Deployment package
│
├── general-query-agent/
│   ├── lambda_function.py           # Lambda handler
│   ├── agent-schema.json            # Bedrock action group schema
│   ├── requirements.txt             # Python dependencies
│   ├── create_deployment_package.sh # Build script
│   └── general-query-agent.zip      # Deployment package
│
└── BEDROCK_DEPLOYMENT.md            # This file
```

**You're all set! Deploy and start chatting with your AI agents!** 🚀
