import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

interface DynamoDbStackProps extends cdk.StackProps {
  appName: string;
}

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

export class DynamoDbStack extends cdk.Stack {
  public readonly dynamoDbTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDbStackProps) {
    super(scope, id, props);

    const { appName } = props;

    this.dynamoDbTable = new dynamodb.Table(this, 'DynamoDbTable', {
      tableName: `${DYNAMODB_TABLE_NAME}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}