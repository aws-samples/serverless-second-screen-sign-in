import { AWSError, DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'websocketInteractions' });

const interceptor = aws4Interceptor({
  region: process.env.AWS_REGION!,
  service: 'execute-api',
});
axios.interceptors.request.use(interceptor);

export type ClientLoginCodePair = {
  loginCode: string;
  connectionId: string;
};

const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

// Iterates from A (65) to Z(90)
const ACCEPTABLE_KEYS = [...Array(25).keys()].map((idx) => String.fromCharCode(65 + idx));

/**
 * Remove the connection.
 *
 * @param connectionId The websocket connection id.
 * @returns void
 */
export function deleteConnection(connectionId: string): Promise<void> {
  return getKeyForConnectionId(connectionId).then(deleteLoginCode);
}

function deleteLoginCode(loginMap: ClientLoginCodePair): Promise<void> {
  return documentClient
    .delete({
      TableName: process.env.TABLE_NAME!,
      Key: {
        loginCode: loginMap.loginCode,
      },
    })
    .promise()
    .then((_it) => {
      return;
    })
    .catch((err: AWSError) => {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn(`Unused Code, silently failing`);
        return;
      } else throw err;
    });
}

/**
 * Gets the 4 digit code from the users connection Id
 *
 * @param connectionId The Websocket connection Id
 * @returns The 4 Digit random code.
 */
export function getKeyForConnectionId(connectionId: string): Promise<ClientLoginCodePair> {
  return documentClient
    .query({
      TableName: process.env.TABLE_NAME!,
      IndexName: 'connectionIdIdx',
      KeyConditionExpression: 'connectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': connectionId,
      },
    })
    .promise()
    .then(({ Items }) => {
      if (Items?.length == 0) {
        logger.error(`Could not find LoginCode for connectionId: ${connectionId}`);
        throw new Error('Could not find LoginCode');
      }

      const loginCodeMap = Items![0] as ClientLoginCodePair;
      logger.info(`Returned ${loginCodeMap.loginCode} for ${loginCodeMap.connectionId}`);
      return loginCodeMap;
    });
}

/**
 * Generate a random 4 digit code
 * @returns a random 4 digit code.
 */
function generateRandomCode(): string {
  return [...Array(4).keys()].map((_) => ACCEPTABLE_KEYS[Math.floor(Math.random() * ACCEPTABLE_KEYS.length)]).join('');
}

/**
 * Generate a random 4 digit code for the user.
 *
 * @param connectionId The Id of the Websocket connection
 * @returns An Object containing the Login Code and the Connection Id.
 */
export function addRandomCodeForUser(connectionId: string): Promise<ClientLoginCodePair> {
  const ttl = Math.floor(new Date().getTime() / 1000) + 3600;
  const loginCode = generateRandomCode();

  const putParameters = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      connectionId,
      ttl,
      loginCode,
    },
  };

  logger.info(`Generated code for ${connectionId}: ${loginCode}`);

  return documentClient
    .put(putParameters)
    .promise()
    .then((_) => ({ loginCode, connectionId }))
    .catch((err: AWSError) => {
      if (err.name === 'ConditionalCheckFailedException') {
        logger.warn(`Code already used, trying to generate new code`);
        return addRandomCodeForUser(connectionId);
      } else throw err;
    });
}

/**
 * Returns the login code to the client, so that it may render it on the page.
 *
 * @param connectionId The reference to the Connection Id of the Users Websocket
 * @param loginCode The 4 digit code that will displayed.
 * @returns The code returned to the client.
 */
export function sendLoginCodeBackToClient(connectionId: string, loginCode: string): Promise<string> {
  logger.info(`Returning code for ${connectionId}: ${loginCode}`);

  return axios
    .post(`${process.env.WEBSOCKET_URI?.replace('wss:', 'https:')}/@connections/${connectionId}`,
      { loginCode })
    .then((_) => loginCode)
    .catch((err) => {
      logger.error('Error thrown when calling websocket', err);
      throw err;
    });
}
