import { Duration, Stack, Fn } from "aws-cdk-lib";  
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { Policy } from "aws-cdk-lib/aws-iam";
import {
  CfnApi,
  CfnDeployment,
  CfnIntegration,
  CfnRoute,
  CfnStage,
} from "aws-cdk-lib/aws-apigatewayv2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from 'path';

export class WebsocketApi extends Construct {
  public readonly websocketUri: string; 
  public readonly websocketInvokeArn: string; 

  constructor(scope: Construct, id: string, table: Table, tableName: string) {
    super(scope, id);

    // initialise api
    const name = "websocketApi";
    const api = new CfnApi(this, name, {
      name: "SingleSocketWebApp",
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });
    this.websocketUri = `${api.attrApiEndpoint}/prod`

    const onMessage = new NodejsFunction(this, "webSocketRequestLoginCode", {
      entry: path.join(__dirname, "../../websockets/index.ts"),
      depsLockFilePath: path.join(__dirname, "../../websockets/package-lock.json"),
      bundling: { 
        minify: true
      },
      handler: "onRequestCode",
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(300),
      memorySize: 1024,
      environment: {
        TABLE_NAME: tableName,
        WEBSOCKET_URI: this.websocketUri // The sending URI uses https.
      },
    });

    const disconnectFunc = new NodejsFunction(this, "websocketOnDisconnectLambda", {
      entry: path.join(__dirname, "../../websockets/index.ts"),
      depsLockFilePath: path.join(__dirname, "../../websockets/package-lock.json"),
      bundling: { 
        minify: true
      },
      handler: "onDisconnectHandler",
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(300),
      memorySize: 1024,
      environment: {
        TABLE_NAME: tableName,
      },
    });

    table.grantReadWriteData(onMessage);
    table.grantReadWriteData(disconnectFunc);

    this.websocketInvokeArn = `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${Fn.ref(api.logicalId)}/*`
    const execApiPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:*"],
      resources: [this.websocketInvokeArn],
    });

    onMessage.role?.attachInlinePolicy(
      new Policy(this, "executeOnMessagePolicy", {
        statements: [execApiPolicy],
      })
    );

    // access role for the socket api to access the socket lambda
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [onMessage.functionArn],
      actions: ["lambda:InvokeFunction"],
    });

    const role = new Role(this, `${name}IamRole`, {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    role.addToPolicy(policy);

    // lambda integration
    const disconnectIntegration = new CfnIntegration(
      this,
      "onDisconnectLambdaIntegration",
      {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri:
          "arn:aws:apigateway:" +
          Stack.of(this).region +
          ":lambda:path/2015-03-31/functions/" +
          disconnectFunc.functionArn +
          "/invocations",
        credentialsArn: role.roleArn,
      }
    );

    const loginCodeIntegration = new CfnIntegration(
      this,
      "requestLoginCodeIntegration",
      {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri:
          "arn:aws:apigateway:" +
          Stack.of(this).region +
          ":lambda:path/2015-03-31/functions/" +
          onMessage.functionArn +
          "/invocations",
        credentialsArn: role.roleArn,
      }
    );

    const deployment = new CfnDeployment(this, `${name}Deployment`, {
      apiId: api.ref,
    });

    const stage = new CfnStage(this, `${name}Stage`, {
      apiId: api.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
      stageName: "prod",
    });

    const disconnectRoute = new CfnRoute(this, "websocketDisonnectRoute", {
      apiId: api.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      target: "integrations/" + disconnectIntegration.ref,
    });

    const onCodeRoute = new CfnRoute(this, "websocketRequestLoginCodeRoute", {
      apiId: api.ref,
      routeKey: "loginCode",
      authorizationType: "NONE",
      target: "integrations/" + loginCodeIntegration.ref,
    });

    deployment.node.addDependency(onCodeRoute);
    deployment.node.addDependency(disconnectRoute);

  }

}
