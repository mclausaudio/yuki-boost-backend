import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

interface AuthStackProps extends cdk.StackProps {
  appName: string;
}

// TODO
// Add the functionality for the other flows / paths (signin, signout, etc)
// // 3/24/23 - leaving the office
// // // I can register, verify, but having trouble signing in. Permissions problems.




// Move API Gateway to a separate stack
// // We will add the /auth/ path to the API Gateway in this stack (AuthStack)

export class AuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { appName, env } = props;

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

    // // Grant the lambda function permission to access the user pool
    const lambdaFunctionRole = new iam.Role(this, 'AuthLambdaFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    
    lambdaFunctionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminInitiateAuth',
        'cognito-idp:SignUp',
        'cognito-idp:ConfirmSignUp',
      ],
      resources: [
        userPool.userPoolArn,
        `${userPool.userPoolArn}/client/*`,
      ],
    }));

    // Define an AWS Lambda function
    const lambdaFunction = new lambda.Function(this, 'AuthLambdaFunction', {
      functionName: `${appName}-auth-function`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/auth'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_ID: userPool.userPoolId,
        REGION: env?.region || "us-east-1"
      },
      role: lambdaFunctionRole,
    });

    // Define an AWS API Gateway
    const api = new apigateway.RestApi(this, 'AuthApiGateway', {
      restApiName: `${appName}-auth-api`,
    });

    // Define an AWS API Gateway integration.  This is the God lambda function that will handle all auth tasks.  Can bring this up later.
    const integration = new apigateway.LambdaIntegration(lambdaFunction);

    // Add a resource for auth
    const authResource = api.root.addResource('auth');

    // Add a sub-resource for signup
    const signupResource = authResource.addResource('signup');
    const signupMethod = signupResource.addMethod('POST', integration);

    // Add a sub-resource for verify
    const verifyResource = authResource.addResource('verify');
    const verifyMethod = verifyResource.addMethod('POST', integration);

    // Add a sub-resource for signin
    const signinResource = authResource.addResource('signin');
    const signinMethod = signinResource.addMethod('POST', integration);

    // Add a sub-resource for signout
    const signoutResource = authResource.addResource('signout');
    const signoutMethod = signoutResource.addMethod('POST', integration);
  }
}
