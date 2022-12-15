// @flow

import invariant from 'invariant';

import type { MessageReactionInfo } from '../selectors/chat-selectors';

function stringForReactionList(
  reactions: $ReadOnlyMap<string, MessageReactionInfo>,
): string {
  const reactionText = [];

  for (const reaction of reactions.keys()) {
    const reactionInfo = reactions.get(reaction);
    invariant(reactionInfo, 'reactionInfo should be set');

    reactionText.push(reaction);
    if (reactionInfo.users.size > 1) {
      reactionText.push(reactionInfo.users.size);
    }
  }

  return reactionText.join(' ');
}

export { stringForReactionList };
