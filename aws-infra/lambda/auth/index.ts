import { 
  CognitoIdentityProviderClient,
  SignUpCommand, 
  ConfirmSignUpCommand,

} from "@aws-sdk/client-cognito-identity-provider";

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });

async function signUp(email: string, password: string, username: string): Promise<string> {
  
  const params = {
    ClientId: USER_POOL_CLIENT_ID,
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
    await cognito.send(command);
    return 'success';
  } catch (error) {
    console.error(error);
    throw new Error(`Error creating user: ${error}`);
  }
}

async function verifyAccount(username: string, verificationCode: string): Promise<string> {
  
  const params = {
    ClientId: USER_POOL_CLIENT_ID,
    Username: username,
    ConfirmationCode: verificationCode,
  };

  const command = new ConfirmSignUpCommand(params);

  try {
    await cognito.send(command);
    return 'success';
  } catch (error) {
    console.error(error);
    throw new Error(`Error creating user: ${error}`);
  }
}

exports.handler = async (event: any) => {
  console.log('BODY no parse :: ',event.body);
  const rootPath = '/auth';
  const { httpMethod, path } = event;
  const { 
    email,
    password,
    username,
    verificationCode = null,
  } = JSON.parse(event.body);

  // if (!username || !password || !email) {
  //   return {
  //     statusCode: 400,
  //     body: JSON.stringify({ message: 'Missing required fields' }),
  //   };
  // }

  try {
    // Determine if the http method is POST
    if (httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method not allowed' }),
      };
    }
    if (path === `${rootPath}/signup`) {
      const signup = await signUp(email, password, username);
    } else
    // if (path === `${rootPath}/signin`) {
    //   const signin = await signIn(username, password);
    // } else
    if (path === `${rootPath}/verify`) {
      const verify = await verifyAccount(username, verificationCode);
    } 
    // else
    // if (path === `${rootPath}/signout`) {
    //   const signout = await signOut(username);
    // } else {
    //   return {
    //     statusCode: 404,
    //     body: JSON.stringify({ message: 'Not found' }),
    //   };
    // }
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
