// @flow

import invariant from 'invariant';
import _sortBy from 'lodash/fp/sortBy.js';
import * as React from 'react';

import { useProcessAndSendDMOperation } from './dm-ops/process-dm-ops.js';
import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import { useThreadHasPermission } from './thread-utils.js';
import { threadSpecs } from './threads/thread-specs.js';
import { stringForUserExplicit } from './user-utils.js';
import { useENSNames } from '../hooks/ens-cache.js';
import { useSendReactionMessage } from '../hooks/message-hooks.js';
import type { ReactionInfo } from '../selectors/chat-selectors.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from '../types/thread-permission-types.js';
import { threadTypeIsThick } from '../types/thread-types-enum.js';
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

      invariant(viewerID, 'viewerID should be set');

      const viewerReacted = reactions[reaction]
        ? reactions[reaction].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      void threadSpecs[threadInfo.type].protocol.sendReaction(
        {
          messageID,
          threadInfo,
          reaction,
          action,
          viewerID,
          showErrorAlert,
        },
        {
          processAndSendDMOperation,
          keyserverSendReaction: callSendReactionMessage,
          dispatchActionPromise,
        },
      );
    },
    [
      messageID,
      viewerID,
      reactions,
      threadInfo,
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
