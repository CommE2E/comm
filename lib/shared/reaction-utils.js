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
    const { size: numberOfReacts } = reactionInfo.users;
    if (numberOfReacts <= 1) {
      continue;
    }
    reactionText.push(numberOfReacts > 9 ? '9+' : numberOfReacts.toString());
  }

  return reactionText.join(' ');
}

export { stringForReactionList };
