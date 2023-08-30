import {
    CfnAuthorizer,
    LambdaIntegration,
    AwsIntegration,
    AuthorizationType,
    RestApi,
    IntegrationResponse,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { Policy } from "aws-cdk-lib/aws-iam";
import {
    Effect,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from 'path';

export class Api extends Construct {
    readonly sendAuthRestApi: RestApi;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Rest API backed by the helloWorldFunction
        this.sendAuthRestApi = new RestApi(this, "sendAuthToWebsocketRestApi", {
            restApiName: "Second Screen Sign On",
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    '*',
                ],
                allowMethods: ['*'],
                allowCredentials: true,
                allowOrigins: ['*'],
            }
        });

    }

    createIntegrations(sendAuthRestApi: RestApi, userPool: UserPool, table: Table, tableName: string, websocketUrl: string) {
        // To validate the code is in the database, disabling the ability to login if it is not. 
        this.createDynamoDBIntegration(sendAuthRestApi, table, tableName);
        // To send the authentication code back to the websocket connected to the code. 
        this.createSendAuthIntegration(sendAuthRestApi, userPool, table, tableName, websocketUrl)
    }

    createSendAuthIntegration(sendAuthRestApi: RestApi, userPool: UserPool, table: Table, tableName: string, websocketUrl: string) {
        // This is the send auth function 
        const sendAuthFunction = new NodejsFunction(this, "sendAuthToWebsocketFunction", {
            entry: path.join(__dirname, "../../api/sendauth/index.ts"),
            depsLockFilePath: path.join(__dirname, "../../api/sendauth/package-lock.json"),
            handler: "handler",
            runtime: Runtime.NODEJS_16_X,
            memorySize: 1024,
            environment: {
                TABLE_NAME: tableName,
                WEBSOCKET_URI: websocketUrl.replace("wss://", "https://")
            },
        });
        table.grantReadWriteData(sendAuthFunction);

        const execApiPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["execute-api:*"],
            resources: ["*"],
        });

        sendAuthFunction.role?.attachInlinePolicy(new Policy(this, "executeOnMessagePolicy", {
            statements: [execApiPolicy],
        }));

        // We want to ensure that the only person who can send a websocket message to the original 
        // is the user who was authorized to do so. 
        const authorizer = new CfnAuthorizer(this, "sendAuthToWebsocketAuthorizer", {
            restApiId: sendAuthRestApi.restApiId,
            name: "AuthToWSAuthorizer",
            type: "COGNITO_USER_POOLS",
            identitySource: "method.request.header.Authorization",
            providerArns: [userPool.userPoolArn],
        });

        const sendAuth = sendAuthRestApi.root.addResource("send");

        sendAuth.addMethod("POST", new LambdaIntegration(sendAuthFunction), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {
                authorizerId: authorizer.ref,
            },
        });
    }

    createDynamoDBIntegration(restApi: RestApi, table: Table, tableName: string) {
        const getPolicy = new Policy(this, 'getCodePolicy', {
            statements: [
                new PolicyStatement({
                    actions: ['dynamodb:GetItem'],
                    effect: Effect.ALLOW,
                    resources: [table.tableArn]
                })
            ]
        });

        const getItemRole = new Role(this, 'getCodeRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
        })

        getItemRole.attachInlinePolicy(getPolicy);

        const responses: IntegrationResponse[] = [
            {
                statusCode: '200',
                responseParameters: {
                    "method.response.header.Access-Control-Allow-Headers": "'*'",
                    "method.response.header.Access-Control-Allow-Methods": "'*'",
                    "method.response.header.Access-Control-Allow-Origin": "'*'"
                },
                responseTemplates: {
                    'application/json': `
            #set($inputRoot = $input.path('$'))
            #if($inputRoot.toString().contains("Item"))
            #set($context.responseOverride.status = 200)
            #else
            #set($context.responseOverride.status = 404)
            #end
            `
                },
            }
        ];

        const validateCodeRoot = restApi.root.addResource("validate");
        const validateCode = validateCodeRoot.addResource("{id}");

        const getIntegration = new AwsIntegration({
            action: 'GetItem',
            service: 'dynamodb',
            options: {
                credentialsRole: getItemRole,
                integrationResponses: responses,
                requestTemplates: {
                    'application/json': `{
            "Key": { 
              "loginCode": { 
                "S": "$method.request.path.id"
              }
            },
            "TableName": "${tableName}" 
            }
          }`,
                }
            }
        });

        validateCode.addMethod('GET', getIntegration, {
            methodResponses: [{
                statusCode: '200', responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                }
            }, {
                statusCode: '404', responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                }
            }]
        });

        return getIntegration;
    }
}
