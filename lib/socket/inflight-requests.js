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
import {
  clientRequestVisualTimeout,
  clientRequestSocketTimeout,
} from '../shared/timeouts';
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

const remainingTimeAfterVisualTimeout =
  clientRequestSocketTimeout - clientRequestVisualTimeout;

class SocketOffline extends ExtendableError { }

class SocketTimeout extends ExtendableError {
  expectedResponseType: ServerSocketMessageType;
  constructor(expectedType: ServerSocketMessageType) {
    super(`socket timed out waiting for response type ${expectedType}`);
    this.expectedResponseType = expectedType;
  }
}
type Callbacks = {|
  timeout: () => void,
  setLateResponse: (messageID: number, isLate: bool) => void,
|};
class InflightRequests {

  data: InflightRequest[] = [];
  timeoutCallback: () => void;
  setLateResponse: (messageID: number, isLate: bool) => void;

  constructor(callbacks: Callbacks) {
    this.timeoutCallback = callbacks.timeout;
    this.setLateResponse = callbacks.setLateResponse;
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

    // We create this object so we can pass it by reference to the timeout
    // function below. That function will avoid setting this request as late if
    // the response has already arrived.
    const requestResult = { concluded: false, lateResponse: false };

    try {
      const response = await Promise.race([
        responsePromise,
        this.timeout(messageID, expectedType, requestResult),
      ]);
      requestResult.concluded = true;
      if (requestResult.lateResponse) {
        this.setLateResponse(messageID, false);
      }
      this.clearRequest(inflightRequest);
      return response;
    } catch (e) {
      requestResult.concluded = true;
      this.clearRequest(inflightRequest);
      if (e instanceof SocketTimeout) {
        this.rejectAll(new Error("socket closed due to timeout"));
        this.timeoutCallback();
      } else if (requestResult.lateResponse) {
        this.setLateResponse(messageID, false);
      }
      throw e;
    }
  }

  async timeout(
    messageID: number,
    expectedType: ServerSocketMessageType,
    requestResult: {| concluded: bool, lateResponse: bool |},
  ) {
    await sleep(clientRequestVisualTimeout);
    if (requestResult.concluded) {
      // We're just doing this to bail out. If requestResult.concluded we can
      // conclude that responsePromise already won the race. Returning here
      // gives Flow errors since Flow is worried response will be undefined.
      throw new Error();
    }
    requestResult.lateResponse = true;
    this.setLateResponse(messageID, true);
    await sleep(remainingTimeAfterVisualTimeout);
    throw new SocketTimeout(expectedType);
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
      } else if (message.type === serverSocketMessageTypes.AUTH_ERROR) {
        inflightRequest.reject(new SocketOffline("auth_error"));
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
      // Though the promise rejection below should call clearRequest when it's
      // caught in fetchResponse, that doesn't happen synchronously. Socket
      // won't close unless all requests are resolved, so we clear immediately
      this.clearRequest(inflightRequest);
      const { reject } = inflightRequest;
      reject(error);
    }
  }

  allRequestsResolvedExcept(excludeMessageID: ?number) {
    for (let inflightRequest of this.data) {
      const { expectedResponseType } = inflightRequest;
      if (
        expectedResponseType !== serverSocketMessageTypes.PONG &&
        (excludeMessageID === null ||
          excludeMessageID === undefined ||
          excludeMessageID !== inflightRequest.messageID)
      ) {
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
