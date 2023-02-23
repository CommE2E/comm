// @flow

import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors';
import { useMessageReactionsList } from 'lib/shared/reaction-utils';

import Modal from '../modal.react';
import css from './message-reactions-modal.css';

type Props = {
  +onClose: () => void,
  +reactions: ReactionInfo,
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
