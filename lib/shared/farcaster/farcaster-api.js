// @flow

import * as React from 'react';

import type { FarcasterMessage } from './farcaster-message-types.js';
import { useTunnelbroker } from '../../tunnelbroker/tunnelbroker-context.js';

export type SendFarcasterTextMessageInput =
  | {
      +groupId: string,
      +message: string,
    }
  | { +recipientFid: string, +message: string };
export type SendFarcasterMessageResult = {
  +result: {
    +messageId: string,
  },
};
function useSendFarcasterTextMessage(): (
  input: SendFarcasterTextMessageInput,
) => Promise<SendFarcasterMessageResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: SendFarcasterTextMessageInput) => {
      const res = await sendFarcasterRequest({
        apiVersion: 'fc',
        endpoint: 'message',
        method: { type: 'PUT' },
        payload: JSON.stringify(input),
      });
      //TODO make it safer
      const result: SendFarcasterMessageResult = JSON.parse(res);
      return result;
    },
    [sendFarcasterRequest],
  );
}

export type FetchFarcasterMessageInput = {
  +conversationId: string,
  +cursor?: number,
  +limit?: number,
  +messageId?: string,
};
export type FetchFarcasterMessageResult = {
  +result: {
    +messages: $ReadOnlyArray<FarcasterMessage>,
  },
};
function useFetchFarcasterMessage(): (
  input: FetchFarcasterMessageInput,
) => Promise<FetchFarcasterMessageResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: FetchFarcasterMessageInput) => {
      console.log('fetcing');
      const { conversationId, cursor, limit, messageId } = input;
      const params = new URLSearchParams({
        conversationId: conversationId.toString(),
      });
      if (cursor !== undefined && cursor !== null) {
        params.set('cursor', cursor.toString());
      }
      if (limit !== undefined && limit !== null) {
        params.set('limit', limit.toString());
      }
      if (messageId !== undefined && messageId !== null) {
        params.set('messageId', messageId.toString());
      }

      console.log(params.toString());

      const res = await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-conversation-messages',
        method: { type: 'GET' },
        payload: params.toString(),
      });
      //TODO make it safer
      const result: FetchFarcasterMessageResult = JSON.parse(res);
      console.log(result);
      return result;
    },
    [sendFarcasterRequest],
  );
}

export { useSendFarcasterTextMessage, useFetchFarcasterMessage };
