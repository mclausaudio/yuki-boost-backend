#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';

const appName: string = 'yuki-boost'

const app = new cdk.App();
const authStack = new AuthStack(app, `${appName}-auth-stack`, {
  appName,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new ApiGatewayStack(app, `${appName}-api-gateway-stack`, {
  appName,
  authStack,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});