import { APIGatewayEvent, APIGatewayProxyResultV2, APIGatewayEventRequestContext } from 'aws-lambda';
import { AWSError, DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'sendAuthToWebsocket' });

type WebsocketAuthEvent = {
  loginCode: string;
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

// Used to intercept requests to the Websocket API and decorate them
// with the correct Authentication method.
const interceptor = aws4Interceptor({
  region: process.env.AWS_REGION,
  service: 'execute-api',
});
axios.interceptors.request.use(interceptor);

const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

/**
 * Use the login code to get the Websocket Connection from DynamoDB.
 *
 * @param loginCode: The 4 digit code from the WebPage.
 * @returns The Connection ID.
 */
function retrieveConnectedWebsocketFromLoginCode(loginCode: string): Promise<string> {
  const getRequest = {
    TableName: process.env.TABLE_NAME as string,
    KeyConditionExpression: 'loginCode = :loginCode',
    ExpressionAttributeValues: {
      ':loginCode': loginCode,
    },
  };

  logger.info('Retrieving connection Id from DynamoDB');

  return documentClient
    .query(getRequest)
    .promise()
    .then(({ Items }) => {
      if (Items?.length === 0) {
        throw new Error('Connection Id Not Found');
      }

      const connectionId = Items![0].connectionId as string;
      logger.info(`Retrieved connection Id: ${connectionId}`);

      return Items![0].connectionId as string;
    })
    .catch((err: AWSError) => {
      logger.error(`Error Retrieving Connection Id`, err);
      if (err.name == 'ConditionalCheckFailedException') {
        throw new Error('Connection Id Not Found');
      }

      throw err;
    });
}

export async function handler(
  event: APIGatewayEvent,
  _: APIGatewayEventRequestContext,
): Promise<APIGatewayProxyResultV2> {
  const wsEvent = JSON.parse(event.body!) as WebsocketAuthEvent;
  logger.info(`Received Event for ${wsEvent.loginCode}`);

  try {
    const connectionId = await retrieveConnectedWebsocketFromLoginCode(wsEvent.loginCode);

    logger.info(`sending Auth Tokens to ${connectionId} for ${wsEvent.loginCode}`);
    return await axios
    .post(`${process.env.WEBSOCKET_URI?.replace('wss:', 'https:')}/@connections/${connectionId}`, wsEvent)
      .then((_) => ({ statusCode: 200 }));
  } catch (error: unknown) {
    logger.error(`Unable to send to client`, error as Error);
    return { statusCode: 500, body: JSON.stringify({ error: (error as Error).message }) };
  }
}
