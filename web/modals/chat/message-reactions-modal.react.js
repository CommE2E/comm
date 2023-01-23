// @flow

import * as React from 'react';

import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { createMessageReactionsList } from 'lib/shared/reaction-utils';

import Modal from '../modal.react';
import css from './message-reactions-modal.css';

type Props = {
  +onClose: () => void,
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
};

function MessageReactionsModal(props: Props): React.Node {
  const { onClose, reactions } = props;

  const reactionsList = React.useMemo(() => {
    const messageReactionsList = createMessageReactionsList(reactions);

    return messageReactionsList.map(messageReactionUser => (
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
