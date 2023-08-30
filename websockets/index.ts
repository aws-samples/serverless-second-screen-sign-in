import { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2, APIGatewayEventRequestContext } from 'aws-lambda';
import { addRandomCodeForUser, sendLoginCodeBackToClient, deleteConnection } from './lib/code';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'websocketInteractions' });

/**
 * Once connected, the user sends a request for their login code.
 *
 * @param event A websocket event containing the connectionId.
 * @param _: unused Context.
 * @returns Returns 200, and sends the login code back to the initial client.
 */
export function onRequestCode(
  event: APIGatewayProxyWebsocketEventV2,
  _: APIGatewayEventRequestContext,
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId;
  logger.info(`Retrieved request for code from ${connectionId}`);

  return addRandomCodeForUser(connectionId)
    .then((loginMap) => sendLoginCodeBackToClient(connectionId, loginMap.loginCode))
    .then((loginCode) => ({
      statusCode: 200,
      body: loginCode,
    }));
}

/**
 * When a client disconnects, be sure to remove their code so as to avoid their code remaining active.
 *
 * @param event websocket event containing the connection Id
 * @param _ context, unused
 * @returns 200.
 */
export function onDisconnectHandler(
  event: APIGatewayProxyWebsocketEventV2,
  _: APIGatewayEventRequestContext,
): Promise<APIGatewayProxyResultV2> {
  const connectionId = event.requestContext.connectionId;
  logger.info(`Retrieved Disconnect for ${connectionId}`);

  return deleteConnection(connectionId).then(() => ({
    statusCode: 200,
  }));
}
