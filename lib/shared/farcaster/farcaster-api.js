// @flow

import * as React from 'react';
import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type {
  FarcasterConversation,
  FarcasterConversationInvitee,
  FarcasterInboxConversation,
} from './farcaster-conversation-types.js';
import {
  farcasterConversationInviteeValidator,
  farcasterConversationValidator,
  farcasterInboxConversationValidator,
} from './farcaster-conversation-types.js';
import type { FarcasterMessage } from './farcaster-messages-types.js';
import { farcasterMessageValidator } from './farcaster-messages-types.js';
import {
  farcasterDCUserValidator,
  type FarcasterDCUser,
} from './farcaster-user-types.js';
import { logTypes, useDebugLogs } from '../../components/debug-logs-context.js';
import { useTunnelbroker } from '../../tunnelbroker/tunnelbroker-context.js';
import { getMessageForException } from '../../utils/errors.js';
import {
  tShapeInexact,
  assertWithValidator,
} from '../../utils/validation-utils.js';

export const notAuthorizedToViewPendingInvitesError =
  'Not authorized to view pending invites';
export const notAuthorizedToAccessConversationError =
  'Not authorized to access this conversation';

export type SendFarcasterTextMessageInput =
  | {
      +groupId: string,
      +message: string,
      +inReplyToMessageId?: string,
    }
  | { +recipientFid: number, +message: string, +inReplyToMessageId?: string };

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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: SendFarcasterTextMessageInput) => {
      try {
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
      } catch (error) {
        addLog(
          'Farcaster API: Failed to send text message',
          JSON.stringify({
            input,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: FetchFarcasterMessageInput) => {
      try {
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
      } catch (error) {
        addLog(
          'Farcaster API: Failed to fetch messages',
          JSON.stringify({
            conversationId: input.conversationId,
            cursor: input.cursor,
            limit: input.limit,
            messageId: input.messageId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: FetchFarcasterInboxInput) => {
      try {
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
      } catch (error) {
        addLog(
          'Farcaster API: Failed to fetch inbox',
          JSON.stringify({
            limit: input.limit,
            category: input.category,
            cursor: input.cursor,
            filter: input.filter,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: FetchFarcasterConversationInput) => {
      try {
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
      } catch (error) {
        addLog(
          'Farcaster API: Failed to fetch conversation',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type FetchFarcasterConversationInvitesInput = {
  +conversationId: string,
};

type FetchFarcasterConversationInvitesResultData = {
  +invites: Array<FarcasterConversationInvitee>,
  ...
};
const fetchFarcasterConversationInvitesResultDataValidator: TInterface<FetchFarcasterConversationInvitesResultData> =
  tShapeInexact({
    invites: t.list(farcasterConversationInviteeValidator),
  });

export type FetchFarcasterConversationInvitesResult = {
  +result: FetchFarcasterConversationInvitesResultData,
  ...
};
const fetchFarcasterConversationInvitesResultValidator: TInterface<FetchFarcasterConversationInvitesResult> =
  tShapeInexact({
    result: fetchFarcasterConversationInvitesResultDataValidator,
  });

function useFetchFarcasterConversationInvites(): (
  input: FetchFarcasterConversationInvitesInput,
) => Promise<FetchFarcasterConversationInvitesResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: FetchFarcasterConversationInvitesInput) => {
      try {
        const { conversationId } = input;
        const params = new URLSearchParams({
          conversationId,
        });

        const response = await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-group-invites',
          method: { type: 'GET' },
          payload: params.toString(),
        });
        const parsedResult = JSON.parse(response);
        const result: FetchFarcasterConversationInvitesResult =
          assertWithValidator(
            parsedResult,
            fetchFarcasterConversationInvitesResultValidator,
          );
        return result;
      } catch (error) {
        const message = getMessageForException(error);
        const isError = !message?.includes(
          notAuthorizedToViewPendingInvitesError,
        );
        const logType = isError
          ? [logTypes.FARCASTER, logTypes.ERROR]
          : [logTypes.FARCASTER];
        addLog(
          'Farcaster API: Failed to fetch conversation invites',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set(logType),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: UpdateFarcasterGroupNameAndDescriptionInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-group',
          method: { type: 'POST' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to update group name and description',
          JSON.stringify({
            conversationId: input.conversationId,
            name: input.name,
            hasDescription: !!input.description,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type UpdateFarcasterThreadAvatarInput = {
  +conversationID: string,
  +action:
    | {
        +type: 'set',
        +imageURL: string,
      }
    | {
        +type: 'remove',
      },
};

function useUpdateFarcasterThreadAvatar(): (
  input: UpdateFarcasterThreadAvatarInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: UpdateFarcasterThreadAvatarInput) => {
      const payload =
        input.action.type === 'set'
          ? {
              conversationId: input.conversationID,
              photoUrl: input.action.imageURL,
            }
          : {
              conversationId: input.conversationID,
            };
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-group-photo',
          method: { type: 'POST' },
          payload: JSON.stringify(payload),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to update group photo',
          JSON.stringify({
            conversationID: input.conversationID,
            action: input.action,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
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
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: UpdateFarcasterSubscriptionInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-conversation-notifications',
          method: { type: 'POST' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to update subscription',
          JSON.stringify({
            conversationId: input.conversationId,
            muted: input.muted,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type StreamFarcasterDirectCastReadInput = {
  +conversationId: string,
};

function useStreamFarcasterDirectCastRead(): (
  input: StreamFarcasterDirectCastReadInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: StreamFarcasterDirectCastReadInput) => {
      try {
        const { conversationId } = input;
        const streamMessage = {
          messageType: 'direct-cast-read',
          payload: { conversationId },
          data: conversationId,
        };

        await sendFarcasterRequest({
          apiVersion: '',
          endpoint: 'direct-cast-read',
          method: { type: 'STREAM' },
          payload: JSON.stringify(streamMessage),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to stream direct cast read',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type MarkFarcasterDirectCastUnreadInput = {
  +conversationId: string,
};

function useMarkFarcasterDirectCastUnread(): (
  input: MarkFarcasterDirectCastUnreadInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: MarkFarcasterDirectCastUnreadInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-manually-mark-unread',
          method: { type: 'PUT' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to mark direct cast unread',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type CreateFarcasterGroupInput = {
  +participantFids: $ReadOnlyArray<number>,
  +name: string,
  +description?: string,
};

type CreateFarcasterGroupResultData = {
  +conversationId: string,
  ...
};
const createFarcasterGroupResultDataValidator: TInterface<CreateFarcasterGroupResultData> =
  tShapeInexact({
    conversationId: t.String,
  });

export type CreateFarcasterGroupResult = {
  +result: CreateFarcasterGroupResultData,
  ...
};
const createFarcasterGroupResultValidator: TInterface<CreateFarcasterGroupResult> =
  tShapeInexact({
    result: createFarcasterGroupResultDataValidator,
  });

function useCreateFarcasterGroup(): (
  input: CreateFarcasterGroupInput,
) => Promise<CreateFarcasterGroupResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: CreateFarcasterGroupInput) => {
      try {
        const response = await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-group',
          method: { type: 'PUT' },
          payload: JSON.stringify(input),
        });

        const parsedResult = JSON.parse(response);
        const result: CreateFarcasterGroupResult = assertWithValidator(
          parsedResult,
          createFarcasterGroupResultValidator,
        );
        return result;
      } catch (error) {
        addLog(
          'Farcaster API: Failed to create group',
          JSON.stringify({
            participantCount: input.participantFids.length,
            name: input.name,
            hasDescription: !!input.description,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type GetFarcasterDirectCastUsersInput = {
  +q: string,
  +limit?: ?number,
  +cursor?: ?string,
  +excludeFIDs?: ?$ReadOnlyArray<string>,
};

type GetFarcasterDirectCastUsersResultData = {
  +users: $ReadOnlyArray<FarcasterDCUser>,
  ...
};
const getFarcasterDirectCastUsersResultDataValidator: TInterface<GetFarcasterDirectCastUsersResultData> =
  tShapeInexact({
    users: t.list(farcasterDCUserValidator),
  });

type GetFarcasterDirectCastUsersCursor = {
  +cursor?: string,
};
const getFarcasterDirectCastUsersCursorValidator: TInterface<GetFarcasterDirectCastUsersCursor> =
  tShapeInexact({
    cursor: t.maybe(t.String),
  });

export type GetFarcasterDirectCastUsersResult = {
  +result: GetFarcasterDirectCastUsersResultData,
  +next?: GetFarcasterDirectCastUsersCursor,
  ...
};
const getFarcasterDirectCastUsersResultValidator: TInterface<GetFarcasterDirectCastUsersResult> =
  tShapeInexact({
    result: getFarcasterDirectCastUsersResultDataValidator,
    next: t.maybe(getFarcasterDirectCastUsersCursorValidator),
  });

function useGetFarcasterDirectCastUsers(): (
  input: GetFarcasterDirectCastUsersInput,
) => Promise<GetFarcasterDirectCastUsersResult> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: GetFarcasterDirectCastUsersInput) => {
      try {
        const { q, limit, cursor, excludeFIDs } = input;
        let query = { q };
        if (limit) {
          query = { ...query, limit };
        }
        if (excludeFIDs) {
          query = { ...query, excludeFIDs };
        }
        if (cursor) {
          query = { ...query, cursor };
        } else {
          // vNext doesn't work when cursor is set
          query = { ...query, vNext: 'true' };
        }

        const params = new URLSearchParams(query);
        const response = await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-users',
          method: { type: 'GET' },
          payload: params.toString(),
        });
        const parsedResult = JSON.parse(response);
        const result: GetFarcasterDirectCastUsersResult = assertWithValidator(
          parsedResult,
          getFarcasterDirectCastUsersResultValidator,
        );
        return result;
      } catch (error) {
        addLog(
          'Farcaster API: Failed to get direct cast users',
          JSON.stringify({
            query: input.q,
            limit: input.limit,
            cursor: input.cursor,
            excludeFIDsCount: input.excludeFIDs?.length,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type ModifyFarcasterMembershipInput =
  | {
      +conversationId: string,
      +action: 'demote',
      +targetFid: number,
    }
  | {
      +conversationId: string,
      +action: 'promote',
      +targetFid: number,
    }
  | {
      +conversationId: string,
      +action: 'remove',
      +targetFid: number,
    }
  | {
      +conversationId: string,
      +action: 'add',
      +inviteCode: string,
    }
  | {
      +conversationId: string,
      +action: 'add',
      +targetFid: number,
    }
  | {
      +conversationId: string,
      +action: 'add',
      +targetFids: $ReadOnlyArray<number>,
    };

function useModifyFarcasterMembershipInput(): (
  input: ModifyFarcasterMembershipInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: ModifyFarcasterMembershipInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-group-membership',
          method: { type: 'POST' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to modify group membership',
          JSON.stringify({
            conversationId: input.conversationId,
            action: input.action,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type SendReactionInput = {
  +conversationId: string,
  +messageId: string,
  +reaction: string,
  +action: 'remove_reaction' | 'add_reaction',
};

function useSendFarcasterReaction(): (
  input: SendReactionInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: SendReactionInput) => {
      try {
        const { action, ...payload } = input;
        const method =
          action === 'remove_reaction' ? { type: 'DELETE' } : { type: 'PUT' };
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-message-reaction',
          method,
          payload: JSON.stringify(payload),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to send reaction',
          JSON.stringify({
            conversationId: input.conversationId,
            messageId: input.messageId,
            reaction: input.reaction,
            action: input.action,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type DeleteFarcasterMessageInput = {
  +conversationId: string,
  +messageId: string,
};

function useDeleteFarcasterMessage(): (
  input: DeleteFarcasterMessageInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: DeleteFarcasterMessageInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'delete-message',
          method: { type: 'DELETE' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to delete message',
          JSON.stringify({
            conversationId: input.conversationId,
            messageId: input.messageId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type AcceptInviteInput = {
  +conversationId: string,
};

function useAcceptInvite(): (input: AcceptInviteInput) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: AcceptInviteInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-accept-group-invite',
          method: { type: 'POST' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to accept group invite',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type AcceptOneOnOneInviteInput = {
  +conversationId: string,
  +category: 'default',
};

function useAcceptOneOnOneInvite(): (
  input: AcceptOneOnOneInviteInput,
) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: AcceptOneOnOneInviteInput) => {
      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-conversation-categorization',
          method: { type: 'POST' },
          payload: JSON.stringify(input),
        });
      } catch (error) {
        addLog(
          'Farcaster API: Failed to accept one-one-one invite',
          JSON.stringify({
            conversationId: input.conversationId,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export type PinMessageInput = {
  +conversationId: string,
  +messageId: string,
  +action: 'pin' | 'unpin',
};

function usePinMessage(): (input: PinMessageInput) => Promise<void> {
  const { sendFarcasterRequest } = useTunnelbroker();
  const { addLog } = useDebugLogs();
  return React.useCallback(
    async (input: PinMessageInput) => {
      const { conversationId, messageId, action } = input;
      const method = action === 'pin' ? { type: 'POST' } : { type: 'DELETE' };

      try {
        await sendFarcasterRequest({
          apiVersion: 'v2',
          endpoint: 'direct-cast-pin-message',
          method,
          payload: JSON.stringify({ conversationId, messageId }),
        });
      } catch (error) {
        addLog(
          `Farcaster API: Failed to ${action} a message`,
          JSON.stringify({
            conversationId,
            messageId,
            action,
            error: getMessageForException(error),
          }),
          new Set([logTypes.FARCASTER, logTypes.ERROR]),
        );
        throw error;
      }
    },
    [addLog, sendFarcasterRequest],
  );
}

export {
  useSendFarcasterTextMessage,
  useFetchFarcasterMessages,
  useFetchFarcasterConversation,
  useFetchFarcasterInbox,
  useUpdateFarcasterGroupNameAndDescription,
  useUpdateFarcasterThreadAvatar,
  useUpdateFarcasterSubscription,
  useStreamFarcasterDirectCastRead,
  useMarkFarcasterDirectCastUnread,
  useCreateFarcasterGroup,
  useGetFarcasterDirectCastUsers,
  useModifyFarcasterMembershipInput,
  useSendFarcasterReaction,
  useDeleteFarcasterMessage,
  useAcceptInvite,
  useFetchFarcasterConversationInvites,
  useAcceptOneOnOneInvite,
  usePinMessage,
};
