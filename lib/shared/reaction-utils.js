// @flow

import invariant from 'invariant';
import _sortBy from 'lodash/fp/sortBy.js';
import * as React from 'react';
import uuid from 'uuid';

import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from './dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from './dm-ops/process-dm-ops.js';
import { getNextLocalID } from './id-utils.js';
import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import { useThreadHasPermission } from './thread-utils.js';
import { stringForUserExplicit } from './user-utils.js';
import { sendReactionMessageActionTypes } from '../actions/message-actions.js';
import { useENSNames } from '../hooks/ens-cache.js';
import { useSendReactionMessage } from '../hooks/message-hooks.js';
import type { ReactionInfo } from '../selectors/chat-selectors.js';
import type { DMSendReactionMessageOperation } from '../types/dm-ops.js';
import { messageTypes } from '../types/message-types-enum.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types.js';
import type { RawReactionMessageInfo } from '../types/messages/reaction.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from '../types/thread-types-enum.js';
import { getMessageForException, SendMessageError } from '../utils/errors.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useViewerAlreadySelectedMessageReactions(
  reactions: ReactionInfo,
): $ReadOnlyArray<string> {
  return React.useMemo(() => {
    const alreadySelectedEmojis = [];

    for (const reaction in reactions) {
      const reactionInfo = reactions[reaction];

      if (reactionInfo.viewerReacted) {
        alreadySelectedEmojis.push(reaction);
      }
    }

    return alreadySelectedEmojis;
  }, [reactions]);
}

export type MessageReactionListInfo = {
  +id: string,
  +isViewer: boolean,
  +reaction: string,
  +username: string,
};

function useMessageReactionsList(
  reactions: ReactionInfo,
): $ReadOnlyArray<MessageReactionListInfo> {
  const withoutENSNames = React.useMemo(() => {
    const result = [];

    for (const reaction in reactions) {
      const reactionInfo = reactions[reaction];

      reactionInfo.users.forEach(user => {
        result.push({
          ...user,
          username: stringForUserExplicit(user),
          reaction,
        });
      });
    }

    const sortByNumReactions = (reactionInfo: MessageReactionListInfo) => {
      const numOfReactions = reactions[reactionInfo.reaction].users.length;
      return numOfReactions ? -numOfReactions : 0;
    };

    return _sortBy(
      ([sortByNumReactions, 'username']: $ReadOnlyArray<
        ((reactionInfo: MessageReactionListInfo) => mixed) | string,
      >),
    )(result);
  }, [reactions]);
  return useENSNames<MessageReactionListInfo>(withoutENSNames);
}

function useCanCreateReactionFromMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ?ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const creatorID = targetMessageInfo?.creator.id;
  const targetMessageCreatorRelationship = useSelector(state =>
    creatorID ? state.userStore.userInfos[creatorID]?.relationshipStatus : null,
  );

  const userHasReactionPermission = useThreadHasPermission(
    threadInfo,
    threadPermissions.REACT_TO_MESSAGE,
  );
  if (!userHasReactionPermission) {
    return false;
  }

  if (
    !targetMessageInfo ||
    (!targetMessageInfo.id && !threadTypeIsThick(threadInfo.type)) ||
    (threadInfo.sourceMessageID &&
      threadInfo.sourceMessageID === targetMessageInfo.id)
  ) {
    return false;
  }

  return (
    !targetMessageCreatorRelationship ||
    !relationshipBlockedInEitherDirection(targetMessageCreatorRelationship)
  );
}

function useSendReactionBase(
  messageID: ?string,
  threadInfo: ThreadInfo,
  reactions: ReactionInfo,
  showErrorAlert: () => mixed,
): (reaction: string) => mixed {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useSendReactionMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  return React.useCallback(
    reaction => {
      if (!messageID) {
        return;
      }

      const localID = getNextLocalID();

      invariant(viewerID, 'viewerID should be set');

      const viewerReacted = reactions[reaction]
        ? reactions[reaction].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      const threadID = threadInfo.id;

      if (threadTypeIsThick(threadInfo.type)) {
        const op: DMSendReactionMessageOperation = {
          type: 'send_reaction_message',
          threadID,
          creatorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          targetMessageID: messageID,
          reaction,
          action,
        };
        const opSpecification: OutboundDMOperationSpecification = {
          type: dmOperationSpecificationTypes.OUTBOUND,
          op,
          recipients: {
            type: 'all_thread_members',
            threadID:
              threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
              threadInfo.parentThreadID
                ? threadInfo.parentThreadID
                : threadInfo.id,
          },
        };
        void processAndSendDMOperation(opSpecification);
        return;
      }

      const reactionMessagePromise = (async () => {
        try {
          const result = await callSendReactionMessage({
            threadID,
            localID,
            targetMessageID: messageID,
            reaction,
            action,
          });
          return {
            localID,
            serverID: result.id,
            threadID,
            time: result.time,
          };
        } catch (e) {
          showErrorAlert();
          const exceptionMessage = getMessageForException(e) ?? '';
          throw new SendMessageError(
            `Exception while sending reaction: ${exceptionMessage}`,
            localID,
            threadID,
          );
        }
      })();

      const startingPayload: RawReactionMessageInfo = {
        type: messageTypes.REACTION,
        threadID,
        localID,
        creatorID: viewerID,
        time: Date.now(),
        targetMessageID: messageID,
        reaction,
        action,
      };

      void dispatchActionPromise(
        sendReactionMessageActionTypes,
        reactionMessagePromise,
        undefined,
        startingPayload,
      );
    },
    [
      messageID,
      viewerID,
      reactions,
      threadInfo.id,
      threadInfo.type,
      threadInfo.parentThreadID,
      dispatchActionPromise,
      processAndSendDMOperation,
      callSendReactionMessage,
      showErrorAlert,
    ],
  );
}

export {
  useViewerAlreadySelectedMessageReactions,
  useMessageReactionsList,
  useCanCreateReactionFromMessage,
  useSendReactionBase,
};
