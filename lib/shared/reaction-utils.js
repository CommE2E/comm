// @flow

import _sortBy from 'lodash/fp/sortBy.js';
import * as React from 'react';

import { relationshipBlockedInEitherDirection } from './relationship-utils.js';
import { threadHasPermission } from './thread-utils.js';
import { stringForUserExplicit } from './user-utils.js';
import { useENSNames } from '../hooks/ens-cache.js';
import type { ReactionInfo } from '../selectors/chat-selectors.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import { threadPermissions, type ThreadInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function stringForReactionList(reactions: ReactionInfo): string {
  const reactionText = [];

  for (const reaction in reactions) {
    const reactionInfo = reactions[reaction];

    reactionText.push(reaction);
    const { length: numberOfReacts } = reactionInfo.users;
    if (numberOfReacts <= 1) {
      continue;
    }
    reactionText.push(numberOfReacts > 9 ? '9+' : numberOfReacts.toString());
  }

  return reactionText.join(' ');
}

type MessageReactionListInfo = {
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
  targetMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const targetMessageCreatorRelationship = useSelector(
    state =>
      state.userStore.userInfos[targetMessageInfo.creator.id]
        ?.relationshipStatus,
  );

  if (
    !targetMessageInfo.id ||
    threadInfo.sourceMessageID === targetMessageInfo.id
  ) {
    return false;
  }

  const creatorRelationshipHasBlock =
    targetMessageCreatorRelationship &&
    relationshipBlockedInEitherDirection(targetMessageCreatorRelationship);

  const hasPermission = threadHasPermission(
    threadInfo,
    threadPermissions.VOICED,
  );

  return hasPermission && !creatorRelationshipHasBlock;
}

export {
  stringForReactionList,
  useMessageReactionsList,
  useCanCreateReactionFromMessage,
};
