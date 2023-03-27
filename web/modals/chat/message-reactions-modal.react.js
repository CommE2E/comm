// @flow

import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { getAvatarForUser } from 'lib/shared/avatar-utils.js';
import { useMessageReactionsList } from 'lib/shared/reaction-utils.js';

import css from './message-reactions-modal.css';
import Avatar from '../../components/avatar.react.js';
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
      messageReactionsList.map(messageReactionUser => {
        const avatarInfo = getAvatarForUser(messageReactionUser);

        return (
          <div key={messageReactionUser.id} className={css.userRowContainer}>
            <div className={css.userInfoContainer}>
              <Avatar size="small" avatarInfo={avatarInfo} />
              <div className={css.username}>{messageReactionUser.username}</div>
            </div>
            <div>{messageReactionUser.reaction}</div>
          </div>
        );
      }),
    [messageReactionsList],
  );

  return (
    <Modal size="large" name="Reactions" onClose={onClose}>
      <div className={css.modalContentContainer}>{reactionsList}</div>
    </Modal>
  );
}

export default MessageReactionsModal;
