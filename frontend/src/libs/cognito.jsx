import { CognitoIdToken, CognitoUserSession, CognitoUser, CognitoAccessToken, CognitoRefreshToken,  CognitoUserPool } from 'amazon-cognito-identity-js';

const TOKEN_URL = `${window.env.authUrl}/oauth2/token`;

const userPool = new CognitoUserPool({
    UserPoolId: window.env.userpoolId,
    ClientId: window.env.clientId,
  });

export const setSignedInUserFromTokens = (tokens) => { 
    const cognitoIdToken = new CognitoIdToken({
        IdToken: tokens.idToken,
      });
      const cognitoAccessToken = new CognitoAccessToken({
        AccessToken: tokens.accessToken,
      });
      const cognitoRefreshToken = new CognitoRefreshToken({
        RefreshToken: tokens.refreshToken,
      });
      const username = cognitoIdToken.payload.email; 

      const user = new CognitoUser({
        Username: username,
        Pool: userPool,
      });

      user.setSignInUserSession(new CognitoUserSession({ 
        AccessToken: cognitoAccessToken,
        IdToken: cognitoIdToken,
        RefreshToken: cognitoRefreshToken,
      }));

      return user;
}

export const getCurrentSession = (user) => { 
    return user.getCurrentSession();
}

export const getTokensFromTokenUrl = (code) => {
    return fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "grant_type": "authorization_code",
        code,
        "client_id": window.env.clientId,
        "redirect_uri": `https://${window.env.domain}/signedIn`
      })
    })
      .then(it => it.json())
      .then(data => {
        return ({
          "idToken": data["id_token"],
          "accessToken": data["access_token"],
          "refreshToken": data["refresh_token"]
        });
      })
  }