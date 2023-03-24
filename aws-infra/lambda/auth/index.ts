import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

async function signUp(email: string, password: string, username: string): Promise<string> {
  const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

  const params = {
    ClientId: USER_POOL_CLIENT_ID, // replace with your User Pool App Client ID
    Username: username,
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
    ],
  };

  const command = new SignUpCommand(params);

  try {
    await client.send(command);
    return 'success';
  } catch (error) {
    console.error(error);
    throw new Error(`Error creating user: ${error}`);
  }
}

exports.handler = async (event: any) => {
  console.log('BODY no parse :: ',event.body);
  
  const {email, password, username } = JSON.parse(event.body);

  // if (!username || !password || !email) {
  //   return {
  //     statusCode: 400,
  //     body: JSON.stringify({ message: 'Missing required fields' }),
  //   };
  // }

  try {
    const signup = await signUp(email, password, username);
    console.log('signup :: ', signup);
  } catch (error) {
    console.error('Error creating user', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error creating user',
        error: error
      }),
    };
  };

  return {
    statusCode: 200,
    body: JSON.stringify({ token: 'myjwt' }),
  };
};
