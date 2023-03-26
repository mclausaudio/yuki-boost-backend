import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthStack } from './auth-stack';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

interface ApiGatewayStackProps extends cdk.StackProps {
  appName: string;
  authStack: AuthStack;
}

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const { appName, authStack } = props;

    // Use the Lambda function from the AuthStack
    const authStackApiLambda = authStack.authStackApiLambda;

    // Define an API Gateway
    const api = new apigateway.RestApi(this, 'AuthApiGateway', {
      restApiName: `${appName}-auth-api`,
    });

    // Define an AWS API Gateway integration
    const integration = new apigateway.LambdaIntegration(authStackApiLambda);

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