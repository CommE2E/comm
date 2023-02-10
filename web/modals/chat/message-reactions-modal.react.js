// @flow

import * as React from 'react';

import type { MessageReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useMessageReactionsList } from 'lib/shared/reaction-utils.js';

import Modal from '../modal.react.js';
import css from './message-reactions-modal.css';

type Props = {
  +onClose: () => void,
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
};

function MessageReactionsModal(props: Props): React.Node {
  const { onClose, reactions } = props;

  const messageReactionsList = useMessageReactionsList(reactions);

  const reactionsList = React.useMemo(
    () =>
      messageReactionsList.map(messageReactionUser => (
        <div key={messageReactionUser.id} className={css.userRowContainer}>
          <div>{messageReactionUser.username}</div>
          <div>{messageReactionUser.reaction}</div>
        </div>
      )),
    [messageReactionsList],
  );

  return (
    <Modal size="large" name="Reactions" onClose={onClose}>
      <div className={css.modalContentContainer}>{reactionsList}</div>
    </Modal>
  );
}

export default MessageReactionsModal;
