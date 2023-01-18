// @flow

import * as React from 'react';

import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForUserExplicit } from 'lib/shared/user-utils';

import Modal from '../modal.react';
import css from './message-reactions-modal.css';

type Props = {
  +onClose: () => void,
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
};

function MessageReactionsModal(props: Props): React.Node {
  const { onClose, reactions } = props;

  const reactionsList = React.useMemo(() => {
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

    return result.map(messageReactionUser => (
      <div key={messageReactionUser.id} className={css.userRowContainer}>
        <div>{messageReactionUser.username}</div>
        <div>{messageReactionUser.reaction}</div>
      </div>
    ));
  }, [reactions]);

  return (
    <Modal size="large" name="Reactions" onClose={onClose}>
      <div className={css.modalContentContainer}>{reactionsList}</div>
    </Modal>
  );
}

export default MessageReactionsModal;
