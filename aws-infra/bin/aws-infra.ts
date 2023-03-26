#!/usr/bin/env node
import 'source-map-support/register';
import 'dotenv/config';

import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { DynamoDbStack } from '../lib/dynamodb-stack';

const appName: string = 'yuki-boost'

const app = new cdk.App();

const dynamoDbStack = new DynamoDbStack(app, `${appName}-dynamo-db-stack`, {
  appName,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

const authStack = new AuthStack(app, `${appName}-auth-stack`, {
  appName,
  dynamoDbTable: dynamoDbStack.dynamoDbTable,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new ApiGatewayStack(app, `${appName}-api-gateway-stack`, {
  appName,
  authStack,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});