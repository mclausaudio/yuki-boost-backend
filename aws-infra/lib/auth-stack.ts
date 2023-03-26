import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

interface AuthStackProps extends cdk.StackProps {
  appName: string;
  dynamoDbTable: dynamodb.Table;
}

export class AuthStack extends cdk.Stack {
  // Need to export the Auth Lambda function to the ApiGatewayStack
  public readonly authStackApiLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { appName, env, dynamoDbTable } = props;

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

    // Define an AWS Lambda function, this is the lambda that will be called by the API Gateway
    const authStackApiLambda = new lambda.Function(this, 'AuthLambdaFunction', {
      functionName: `${appName}-auth-function`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/auth/apiRoutes'),
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_POOL_ID: userPool.userPoolId,
        REGION: env?.region || "us-east-1"
      },
      role: lambdaFunctionRole,
    });
    // export the lambda function for the ApiGatewayStack
    this.authStackApiLambda = authStackApiLambda;

    // Now we need to make a lambda function to create the user in the DynamoDB table
    // This will be called by the userPool's POST_CONFIRMATION trigger
    const createUserInDbTableLambda = new lambda.Function(this, 'CreateUserInDbTableLambda', {
      functionName: `${appName}-create-user-in-db-table-function`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/auth/createUserInDbTable'),
      environment: {
        USER_TABLE_NAME: dynamoDbTable.tableName || "UserTable",
        REGION: env?.region || "us-east-1"
      }
    });

    dynamoDbTable.grantWriteData(createUserInDbTableLambda);
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, createUserInDbTableLambda);
  }
}
