// @flow

import invariant from 'invariant';

import type { MessageReactionInfo } from '../selectors/chat-selectors';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types';
import { threadPermissions, type ThreadInfo } from '../types/thread-types';
import { useSelector } from '../utils/redux-utils';
import { relationshipBlockedInEitherDirection } from './relationship-utils';
import { threadHasPermission } from './thread-utils';
import { stringForUserExplicit } from './user-utils';

function stringForReactionList(
  reactions: $ReadOnlyMap<string, MessageReactionInfo>,
): string {
  const reactionText = [];

  for (const reaction of reactions.keys()) {
    const reactionInfo = reactions.get(reaction);
    invariant(reactionInfo, 'reactionInfo should be set');

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

function createMessageReactionsList(
  reactions: $ReadOnlyMap<string, MessageReactionInfo>,
): $ReadOnlyArray<MessageReactionListInfo> {
  const result = [];

  for (const [reaction, reactionInfo] of reactions) {
    reactionInfo.users.forEach(user => {
      result.push({
        ...user,
        username: stringForUserExplicit(user),
        reaction,
      });
    });
  }

  result.sort((a, b) => {
    const numOfReactionsA = reactions.get(a.reaction)?.users.length;
    const numOfReactionsB = reactions.get(b.reaction)?.users.length;

    if (!numOfReactionsA || !numOfReactionsB) {
      return 0;
    }

    if (numOfReactionsA < numOfReactionsB) {
      return 1;
    } else if (numOfReactionsA > numOfReactionsB) {
      return -1;
    }

    if (a.username < b.username) {
      return -1;
    } else if (a.username > b.username) {
      return 1;
    }

    return 0;
  });

  return result;
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
  createMessageReactionsList,
  useCanCreateReactionFromMessage,
};
