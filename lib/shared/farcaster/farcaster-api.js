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
      const response = await sendFarcasterRequest({
        apiVersion: 'fc',
        endpoint: 'message',
        method: { type: 'PUT' },
        payload: JSON.stringify(input),
      });

      //FIXME: add validators to avoid crashing clients
      const result: SendFarcasterMessageResult = JSON.parse(response);
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

      const response = await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-conversation-messages',
        method: { type: 'GET' },
        payload: params.toString(),
      });
      //FIXME: add validators to avoid crashing clients
      const result: FetchFarcasterMessageResult = JSON.parse(response);
      return result;
    },
    [sendFarcasterRequest],
  );
}

export { useSendFarcasterTextMessage, useFetchFarcasterMessage };
