// @flow

import * as React from 'react';

import { type MessageReactionListInfo } from 'lib/shared/reaction-utils.js';

import css from './message-reactions-modal.css';
import UserAvatar from '../../avatars/user-avatar.react.js';

type Props = {
  +messageReactionUser: MessageReactionListInfo,
};

function MessageReactionsListItem(props: Props): React.Node {
  const { messageReactionUser } = props;

  const messageReactionsListItem = React.useMemo(
    () => (
      <div className={css.userRowContainer}>
        <div className={css.userInfoContainer}>
          <UserAvatar size="S" userID={messageReactionUser.id} />
          <div className={css.username}>{messageReactionUser.username}</div>
        </div>
        <div>{messageReactionUser.reaction}</div>
      </div>
    ),
    [
      messageReactionUser.id,
      messageReactionUser.reaction,
      messageReactionUser.username,
    ],
  );

  return messageReactionsListItem;
}

export default MessageReactionsListItem;
