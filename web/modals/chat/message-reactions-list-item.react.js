// @flow

import * as React from 'react';

import { type MessageReactionListInfo } from 'lib/shared/reaction-utils.js';

import css from './message-reactions-modal.css';
import UserAvatar from '../../avatars/user-avatar.react.js';
import { usePushUserProfileModal } from '../user-profile/user-profile-utils.js';

type Props = {
  +messageReactionUser: MessageReactionListInfo,
};

function MessageReactionsListItem(props: Props): React.Node {
  const { messageReactionUser } = props;

  const pushUserProfileModal = usePushUserProfileModal({
    userID: messageReactionUser.id,
  });

  return (
    <div className={css.userRowContainer} onClick={pushUserProfileModal}>
      <div className={css.userInfoContainer}>
        <UserAvatar size="S" userID={messageReactionUser.id} />
        <div className={css.username}>{messageReactionUser.username}</div>
      </div>
      <div>{messageReactionUser.reaction}</div>
    </div>
  );
}

export default MessageReactionsListItem;
