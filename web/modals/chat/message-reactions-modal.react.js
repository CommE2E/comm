// @flow

import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useMessageReactionsList } from 'lib/shared/reaction-utils.js';

import MessageReactionsListItem from './message-reactions-list-item.react.js';
import css from './message-reactions-modal.css';
import Modal from '../modal.react.js';

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
        <MessageReactionsListItem
          key={messageReactionUser.id}
          messageReactionUser={messageReactionUser}
        />
      )),
    [messageReactionsList],
  );

  return (
    <Modal size="large" name="All reactions" onClose={onClose}>
      <div className={css.modalContentContainer}>{reactionsList}</div>
    </Modal>
  );
}

export default MessageReactionsModal;
