// @flow

import {
  type ServerSocketMessage,
  type RequestsServerSocketMessage,
  type ActivityUpdateResponseServerSocketMessage,
  type PongServerSocketMessage,
  serverSocketMessageTypes,
} from '../types/socket-types';

import { ServerError } from '../utils/errors';

type BaseInflightRequest<Response: ServerSocketMessage> = {|
  expectedResponseType: $PropertyType<Response, 'type'>,
  resolve: (response: Response) => void,
  reject: (error: Error) => void,
  messageID: number,
|};
export type InflightRequest =
  | BaseInflightRequest<RequestsServerSocketMessage>
  | BaseInflightRequest<ActivityUpdateResponseServerSocketMessage>;

function resolveRequests(
  message: ServerSocketMessage,
  inflightRequests: $ReadOnlyArray<InflightRequest>,
): InflightRequest[] {
  const remainingInflightRequests = [];
  for (let inflightRequest of inflightRequests) {
    if (inflightRequest.messageID !== message.responseTo) {
      remainingInflightRequests.push(inflightRequest);
      continue;
    }
    if (message.type === serverSocketMessageTypes.ERROR) {
      const error = message.payload
        ? new ServerError(message.message, message.payload)
        : new ServerError(message.message);
      inflightRequest.reject(error);
    } else if (
      message.type === serverSocketMessageTypes.REQUESTS &&
      inflightRequest.expectedResponseType === serverSocketMessageTypes.REQUESTS
    ) {
      inflightRequest.resolve(message);
    } else if (
      message.type === serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE &&
      inflightRequest.expectedResponseType ===
        serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE
    ) {
      inflightRequest.resolve(message);
    } else {
      remainingInflightRequests.push(inflightRequest);
    }
  }
  return remainingInflightRequests;
}

export {
  resolveRequests,
};
