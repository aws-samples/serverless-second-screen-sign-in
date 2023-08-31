import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CognitoUserPool } from "./cognitoUserPool";
import { DynamoDBTable } from "./dynamodb";
import { WebsiteHosting } from "./website";
import { WebsocketApi } from "./websockets";
import * as dotenv from "dotenv";
import { Api } from "./api";

dotenv.config();

export class SecondScreenSignOnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
    });

    const ddb = new DynamoDBTable(this, `clientstorage-ddb`);
    const ws = new WebsocketApi(
      this,
      `websockets`,
      ddb.table,
      ddb.tableName
    );

    const api =  new Api(this, `restApi`);

    const cognito = new CognitoUserPool(this, `cognito`);

    const authUrl = `${this.node.tryGetContext('project_prefix')}.auth..eu-west-1.amazoncognito.com`
    const web = new WebsiteHosting(this, `${id}-website`);
    
    const client = cognito.setUpCognitoClient(web.distributionUrl)
    

    web.deployWebsiteToS3(api.sendAuthRestApi.url, ws.websocketUri, web.distributionUrl, authUrl, client.userPoolClientId, cognito.userPool.userPoolId)
    api.createIntegrations(api.sendAuthRestApi, cognito.userPool, ddb.table, ddb.tableName, ws.websocketUri, ws.websocketInvokeArn);
  }
}
