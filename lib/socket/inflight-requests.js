// @flow

import {
  type ServerSocketMessage,
  type StateSyncServerSocketMessage,
  type RequestsServerSocketMessage,
  type ActivityUpdateResponseServerSocketMessage,
  type PongServerSocketMessage,
  type APIResponseServerSocketMessage,
  type ServerSocketMessageType,
  serverSocketMessageTypes,
} from '../types/socket-types';

import invariant from 'invariant';

import { ServerError, ExtendableError } from '../utils/errors';
import { clientRequestSocketTimeout } from '../shared/timeouts';
import sleep from '../utils/sleep';

type ValidResponseMessageMap = {
  a: StateSyncServerSocketMessage,
  b: RequestsServerSocketMessage,
  c: ActivityUpdateResponseServerSocketMessage,
  d: PongServerSocketMessage,
  e: APIResponseServerSocketMessage,
};
type BaseInflightRequest<Response: ServerSocketMessage> = {|
  expectedResponseType: $PropertyType<Response, 'type'>,
  resolve: (response: Response) => void,
  reject: (error: Error) => void,
  messageID: number,
|};
type InflightRequestMap = $ObjMap<
  ValidResponseMessageMap,
  <T>(T) => BaseInflightRequest<$Exact<T>>,
>;

type ValidResponseMessage = $Values<ValidResponseMessageMap>;
type InflightRequest = $Values<InflightRequestMap>;

class SocketOffline extends ExtendableError { }

class SocketTimeout extends ExtendableError {
  expectedResponseType: ServerSocketMessageType;
  constructor(expectedType: ServerSocketMessageType) {
    super(`socket timed out waiting for response type ${expectedType}`);
    this.expectedResponseType = expectedType;
  }
}
async function timeout(expectedType: ServerSocketMessageType) {
  await sleep(clientRequestSocketTimeout);
  throw new SocketTimeout(expectedType);
}

class InflightRequests {

  data: InflightRequest[] = [];
  timeoutCallback: () => void;

  constructor(timeoutCallback: () => void) {
    this.timeoutCallback = timeoutCallback;
  }

  async fetchResponse<M: ValidResponseMessage>(
    messageID: number,
    expectedType: $PropertyType<M, 'type'>,
  ): Promise<M> {
    let inflightRequest: ?InflightRequest;
    const responsePromise = new Promise((resolve, reject) => {
      // Flow makes us do these unnecessary runtime checks...
      if (expectedType === serverSocketMessageTypes.STATE_SYNC) {
        inflightRequest = {
          expectedResponseType: serverSocketMessageTypes.STATE_SYNC,
          resolve,
          reject,
          messageID,
        };
      } else if (expectedType === serverSocketMessageTypes.REQUESTS) {
        inflightRequest = {
          expectedResponseType: serverSocketMessageTypes.REQUESTS,
          resolve,
          reject,
          messageID,
        };
      } else if (
        expectedType === serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE
      ) {
        inflightRequest = {
          expectedResponseType:
            serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
          resolve,
          reject,
          messageID,
        };
      } else if (expectedType === serverSocketMessageTypes.PONG) {
        inflightRequest = {
          expectedResponseType: serverSocketMessageTypes.PONG,
          resolve,
          reject,
          messageID,
        };
      } else if (expectedType === serverSocketMessageTypes.API_RESPONSE) {
        inflightRequest = {
          expectedResponseType: serverSocketMessageTypes.API_RESPONSE,
          resolve,
          reject,
          messageID,
        };
      }
    });
    invariant(
      inflightRequest,
      `${expectedType} is an invalid server response type`,
    );
    this.data.push(inflightRequest);
    try {
      const response = await Promise.race([
        responsePromise,
        timeout(expectedType),
      ]);
      this.clearRequest(inflightRequest);
      return response;
    } catch (e) {
      this.clearRequest(inflightRequest);
      if (e instanceof SocketTimeout) {
        this.rejectAll(new Error("socket closed due to timeout"));
        this.timeoutCallback();
      }
      throw e;
    }
  }

  clearRequest(requestToClear: InflightRequest) {
    this.data = this.data.filter(request => request !== requestToClear);
  }

  resolveRequestsForMessage(message: ServerSocketMessage) {
    for (let inflightRequest of this.data) {
      if (
        message.responseTo === null ||
        message.responseTo === undefined ||
        inflightRequest.messageID !== message.responseTo
      ) {
        continue;
      }
      if (message.type === serverSocketMessageTypes.ERROR) {
        const error = message.payload
          ? new ServerError(message.message, message.payload)
          : new ServerError(message.message);
        inflightRequest.reject(error);
      } else if (
        message.type === serverSocketMessageTypes.STATE_SYNC &&
        inflightRequest.expectedResponseType ===
          serverSocketMessageTypes.STATE_SYNC
      ) {
        inflightRequest.resolve(message);
      } else if (
        message.type === serverSocketMessageTypes.REQUESTS &&
        inflightRequest.expectedResponseType ===
          serverSocketMessageTypes.REQUESTS
      ) {
        inflightRequest.resolve(message);
      } else if (
        message.type === serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE &&
        inflightRequest.expectedResponseType ===
          serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE
      ) {
        inflightRequest.resolve(message);
      } else if (
        message.type === serverSocketMessageTypes.PONG &&
        inflightRequest.expectedResponseType === serverSocketMessageTypes.PONG
      ) {
        inflightRequest.resolve(message);
      } else if (
        message.type === serverSocketMessageTypes.API_RESPONSE &&
        inflightRequest.expectedResponseType ===
          serverSocketMessageTypes.API_RESPONSE
      ) {
        inflightRequest.resolve(message);
      }
    }
  }

  rejectAll(error: Error) {
    for (let inflightRequest of this.data) {
      const { reject } = inflightRequest;
      reject(error);
    }
  }

  get allRequestsResolved(): bool {
    for (let inflightRequest of this.data) {
      const { expectedResponseType } = inflightRequest;
      if (expectedResponseType !== serverSocketMessageTypes.PONG) {
        return false;
      }
    }
    return true;
  }

}

export {
  SocketOffline,
  SocketTimeout,
  InflightRequests,
};
