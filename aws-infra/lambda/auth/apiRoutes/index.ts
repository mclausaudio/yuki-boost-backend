import { 
  CognitoIdentityProviderClient,
  SignUpCommand, 
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand
} from "@aws-sdk/client-cognito-identity-provider";

const { USER_POOL_CLIENT_ID, REGION } = process.env;

const cognito = new CognitoIdentityProviderClient({ region: REGION });

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

async function signIn(username: string = "", email: string = "", password: string = ""): Promise<string> {
  const authParams = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: username || email,
      PASSWORD: password,
    },
  };

  const command = new InitiateAuthCommand(authParams);

  try {
    const response = await cognito.send(command);

    if (response.AuthenticationResult) {
      return response.AuthenticationResult.AccessToken || "";
    } else {
      throw new Error("Unknown error occurred.");
    }
  } catch (error) {
    throw new Error(`Error signing in user: ${error}`);
  }
}

async function signOut(accessToken: string): Promise<string> {
  const params = {
    AccessToken: accessToken,
  };

  const command = new GlobalSignOutCommand(params);

  try {
    await cognito.send(command);
    return "success";
  } catch (error) {
    console.error(error);
    throw new Error(`Error signing out user: ${error}`);
  }
}

exports.handler = async (event: any) => {
  console.log("Event: ", event);
  const rootPath = "/auth";
  const { httpMethod, path } = event;
  const {
    email,
    password,
    username,
    verificationCode = "",
    accessToken = "",
  } = JSON.parse(event.body);

  let response = {
    statusCode: 200,
    body: {},
  };

  try {
    // Determine if the http method is POST
    if (httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method not allowed" }),
      };
    }
    if (path === `${rootPath}/signup`) {
      const signup = await signUp(email, password, username);
      response.statusCode = 201;
      response.body = { message: "User registered successfully.", response: signup };
    } else if (path === `${rootPath}/verify`) {
      const verify = await verifyAccount(username, verificationCode);
      response.statusCode = 200;
      response.body = { message: "User verified successfully.", response: verify };
    } else if (path === `${rootPath}/signin`) {
      const signin = await signIn(username, email, password);
      response.statusCode = 200;
      response.body = { token: signin || null };
    } else if (path === `${rootPath}/signout`) {
      const signout = await signOut(accessToken);
      response.statusCode = 200;
      response.body = { message: "User signed out successfully.", response: signout };
    }
    else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not found" }),
      };
    }
  } catch (error) {
    console.error("Error processing request", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing request",
        error: error,
      }),
    };
  }

  return {
    statusCode: response.statusCode,
    body: JSON.stringify(response.body),
  };
};
