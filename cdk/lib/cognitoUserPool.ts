import {
  UserPool,
  UserPoolEmail,
  OAuthScope,
  CfnUserPool,
  UserPoolClient,
} from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class CognitoUserPool extends Construct {
  readonly userPool: UserPool;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new UserPool(this, "secondScreenExampleUserPool", {
      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },
      selfSignUpEnabled: true,
      accountRecovery: 2,
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: false,
        },
        givenName: {
          required: true,
          mutable: true,
        },
      },

      email: UserPoolEmail.withCognito(this.node.tryGetContext('email'))        
    });    
  }


  setUpCognitoClient(callbackUri: string): UserPoolClient {
    const client = this.userPool.addClient("secondSignOnExampleClient", {
      generateSecret: false,
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: [`https://${callbackUri}/signedIn`]
      },
    })

    this.userPool.addDomain("secondScreenDomain", {
      cognitoDomain: {
        domainPrefix: this.node.tryGetContext('project_prefix')        
      },
    });


    const cfnUserPool = this.userPool.node.defaultChild as CfnUserPool;
    cfnUserPool.emailConfiguration = {
      emailSendingAccount: "DEVELOPER",
      replyToEmailAddress: this.node.tryGetContext('email'),
      sourceArn: this.node.tryGetContext('email_arn'),
    };

    return client;
  }
  
}
