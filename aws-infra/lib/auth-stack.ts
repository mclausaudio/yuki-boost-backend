import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

interface AuthStackProps extends cdk.StackProps {
  appName: string;
}

// TODO
// Create a better user verification flow
// Move API Gateway to a separate stack
// // We will add the /auth/ path to the API Gateway in this stack (AuthStack)

export class AuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { appName } = props;

    // First, define an AWS Cognito pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${appName}-user-pool`,
      signInCaseSensitive: false, // case insensitive is preferred in most situations
      selfSignUpEnabled: true,
      autoVerify: { email: true, phone: true },
      signInAliases: {
        username: true,
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
      },
      keepOriginal: {
        email: true,
        phone: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        }
      }
    });

    // An app is an entity within a user pool that has permission to call unauthenticated APIs(APIs that do not have an authenticated user), 
    // such as APIs to register, sign in, and handle forgotten passwords.
    // To call these APIs, you need an app client ID and an optional client secret.
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html#app-clients
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: userPool,
      userPoolClientName: `${appName}-user-pool-app-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
      },
    });

    // Define an AWS Lambda function
    const lambdaFunction = new lambda.Function(this, 'AuthLambdaFunction', {
      functionName: `${appName}-auth-function`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/auth'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // Define an AWS API Gateway
    const api = new apigateway.RestApi(this, 'AuthApiGateway', {
      restApiName: `${appName}-auth-api`,
    });

    // 
    const integration = new apigateway.LambdaIntegration(lambdaFunction);

    // Define an API Gateway resource and method
    const resource = api.root.addResource('auth');
    const method = resource.addMethod('POST', integration);    
  }
}
