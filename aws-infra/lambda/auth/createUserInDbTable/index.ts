const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { PutCommand } = require("@aws-sdk/lib-dynamodb"); 
// const { marshall } = require("@aws-sdk/util-dynamodb");

const { REGION } = process.env;

const dynamoDbClient = new DynamoDBClient({ region: REGION });

exports.handler = async (event: any, context: any) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    console.log('event: ', event);
    
    const { userName, request } = event;
    const email = request.userAttributes.email;
    const createdAt = new Date().toISOString();

    const userItem = {
      PK: `USER#${userName}`,
      SK: `METADATA#${userName}`,
      userId: userName,
      email: email,
      createdAt: createdAt,
      updatedAt: createdAt,
    };

    const params = {
      TableName: process.env.USER_TABLE_NAME,
      Item: userItem,
    };

    try {
      const command = new PutCommand(params);
      await dynamoDbClient.send(command);
    } catch (error) {
      console.error(`Error adding user ${userName} to DynamoDB`, error);
      context.fail(error);
    }
  }

  // Return the event object to continue the execution of other triggers, if they
  return event;
};
