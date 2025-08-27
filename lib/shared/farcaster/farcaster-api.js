// @flow

import * as React from 'react';
import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type {
  FarcasterConversation,
  FarcasterInboxConversation,
} from './farcaster-conversation-types.js';
import {
  farcasterConversationValidator,
  farcasterInboxConversationValidator,
} from './farcaster-conversation-types.js';
import type { FarcasterMessage } from './farcaster-messages-types.js';
import { farcasterMessageValidator } from './farcaster-messages-types.js';
import { useTunnelbroker } from '../../tunnelbroker/tunnelbroker-context.js';
import {
  tShapeInexact,
  assertWithValidator,
} from '../../utils/validation-utils.js';

export type SendFarcasterTextMessageInput =
  | {
      +groupId: string,
      +message: string,
    }
  | { +recipientFid: string, +message: string };

type SendFarcasterMessageResultData = {
  +messageId: string,
  ...
};
const sendFarcasterMessageResultDataValidator: TInterface<SendFarcasterMessageResultData> =
  tShapeInexact({
    messageId: t.String,
  });

export type SendFarcasterMessageResult = {
  +result: SendFarcasterMessageResultData,
  ...
};
const sendFarcasterMessageResultValidator: TInterface<SendFarcasterMessageResult> =
  tShapeInexact({
    result: sendFarcasterMessageResultDataValidator,
  });

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

      const parsedResult = JSON.parse(response);
      const result: SendFarcasterMessageResult = assertWithValidator(
        parsedResult,
        sendFarcasterMessageResultValidator,
      );
      return result;
    },
    [sendFarcasterRequest],
  );
}

export type FetchFarcasterMessageInput = {
  +conversationId: string,
  +cursor?: string,
  +limit?: number,
  +messageId?: string,
};

type FetchFarcasterMessageResultData = {
  +messages: $ReadOnlyArray<FarcasterMessage>,
  ...
};
const fetchFarcasterMessageResultDataValidator: TInterface<FetchFarcasterMessageResultData> =
  tShapeInexact({
    messages: t.list(farcasterMessageValidator),
  });

type FetchFarcasterMessageCursor = {
  +cursor?: string,
};
const fetchFarcasterMessageCursorValidator: TInterface<FetchFarcasterMessageCursor> =
  tShapeInexact({
    cursor: t.maybe(t.String),
  });

export type FetchFarcasterMessageResult = {
  +result: FetchFarcasterMessageResultData,
  +next?: FetchFarcasterMessageCursor,
  ...
};
const fetchFarcasterMessageResultValidator: TInterface<FetchFarcasterMessageResult> =
  tShapeInexact({
    result: fetchFarcasterMessageResultDataValidator,
    next: t.maybe(fetchFarcasterMessageCursorValidator),
  });

function useFetchFarcasterMessages(): (
  input: FetchFarcasterMessageInput,
) => Promise<FetchFarcasterMessageResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: FetchFarcasterMessageInput) => {
      const { conversationId, cursor, limit, messageId } = input;
      const params: { [string]: string } = {
        conversationId,
      };
      if (cursor !== undefined && cursor !== null) {
        params.cursor = cursor;
      }
      if (limit !== undefined && limit !== null) {
        params.limit = limit.toString();
      }
      if (messageId !== undefined && messageId !== null) {
        params.messageId = messageId;
      }

      const response = await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-conversation-messages',
        method: { type: 'GET' },
        payload: new URLSearchParams(params).toString(),
      });
      const parsedResult = JSON.parse(response);
      const result: FetchFarcasterMessageResult = assertWithValidator(
        parsedResult,
        fetchFarcasterMessageResultValidator,
      );
      return result;
    },
    [sendFarcasterRequest],
  );
}

export type FetchFarcasterInboxInput = {
  +limit?: number,
  +category?: 'archived' | 'request',
  +cursor?: string,
  +filter?: 'unread' | 'group' | '1-1',
};

type FetchFarcasterInboxResultData = {
  +conversations: $ReadOnlyArray<FarcasterInboxConversation>,
  +hasArchived: boolean,
  +hasUnreadRequests: boolean,
  +requestsCount: number,
  ...
};
const fetchFarcasterInboxResultDataValidator: TInterface<FetchFarcasterInboxResultData> =
  tShapeInexact({
    conversations: t.list(farcasterInboxConversationValidator),
    hasArchived: t.Boolean,
    hasUnreadRequests: t.Boolean,
    requestsCount: t.Number,
  });

type FetchFarcasterInboxResultNext = {
  +cursor?: string,
  ...
};
const fetchFarcasterInboxResultNextValidator: TInterface<FetchFarcasterInboxResultNext> =
  tShapeInexact({
    cursor: t.maybe(t.String),
  });

export type FetchFarcasterInboxResult = {
  +result: FetchFarcasterInboxResultData,
  +next?: FetchFarcasterInboxResultNext,
  ...
};
const fetchFarcasterInboxResultValidator: TInterface<FetchFarcasterInboxResult> =
  tShapeInexact({
    result: fetchFarcasterInboxResultDataValidator,
    next: t.maybe(fetchFarcasterInboxResultNextValidator),
  });

function useFetchFarcasterInbox(): (
  input: FetchFarcasterInboxInput,
) => Promise<FetchFarcasterInboxResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: FetchFarcasterInboxInput) => {
      const { limit, category, cursor, filter } = input;

      const params: { [string]: string } = {};
      if (cursor !== undefined && cursor !== null) {
        params.cursor = cursor;
      }
      if (limit !== undefined && limit !== null) {
        params.limit = limit.toString();
      }
      if (category !== undefined && category !== null) {
        params.category = category;
      }
      if (filter !== undefined && filter !== null) {
        params.filter = filter;
      }

      const response = await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-inbox',
        method: { type: 'GET' },
        payload: new URLSearchParams(params).toString(),
      });
      const parsedResult = JSON.parse(response);
      const result: FetchFarcasterInboxResult = assertWithValidator(
        parsedResult,
        fetchFarcasterInboxResultValidator,
      );
      return result;
    },
    [sendFarcasterRequest],
  );
}

export type FetchFarcasterConversationInput = {
  +conversationId: string,
};

type FetchFarcasterConversationResultData = {
  +conversation: FarcasterConversation,
  ...
};
const fetchFarcasterConversationResultDataValidator: TInterface<FetchFarcasterConversationResultData> =
  tShapeInexact({
    conversation: farcasterConversationValidator,
  });

export type FetchFarcasterConversationResult = {
  +result: FetchFarcasterConversationResultData,
  ...
};
const fetchFarcasterConversationResultValidator: TInterface<FetchFarcasterConversationResult> =
  tShapeInexact({
    result: fetchFarcasterConversationResultDataValidator,
  });

function useFetchFarcasterConversation(): (
  input: FetchFarcasterConversationInput,
) => Promise<FetchFarcasterConversationResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: FetchFarcasterConversationInput) => {
      const { conversationId } = input;
      const params = new URLSearchParams({
        conversationId,
      });

      const response = await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-conversation',
        method: { type: 'GET' },
        payload: params.toString(),
      });
      const parsedResult = JSON.parse(response);
      const result: FetchFarcasterConversationResult = assertWithValidator(
        parsedResult,
        fetchFarcasterConversationResultValidator,
      );
      return result;
    },
    [sendFarcasterRequest],
  );
}

export type UpdateFarcasterGroupNameAndDescriptionInput = {
  +conversationId: string,
  +name: string,
  +description?: string,
};

function useUpdateFarcasterGroupNameAndDescription(): (
  input: UpdateFarcasterGroupNameAndDescriptionInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: UpdateFarcasterGroupNameAndDescriptionInput) => {
      await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-group',
        method: { type: 'POST' },
        payload: JSON.stringify(input),
      });
    },
    [sendFarcasterRequest],
  );
}

export type UpdateFarcasterSubscriptionInput = {
  +conversationId: string,
  +muted: boolean,
};

function useUpdateFarcasterSubscription(): (
  input: UpdateFarcasterSubscriptionInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  return React.useCallback(
    async (input: UpdateFarcasterSubscriptionInput) => {
      await sendFarcasterRequest({
        apiVersion: 'v2',
        endpoint: 'direct-cast-conversation-notifications',
        method: { type: 'POST' },
        payload: JSON.stringify(input),
      });
    },
    [sendFarcasterRequest],
  );
}

export {
  useSendFarcasterTextMessage,
  useFetchFarcasterMessages,
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  useUpdateFarcasterGroupNameAndDescription,
  useUpdateFarcasterSubscription,
};
