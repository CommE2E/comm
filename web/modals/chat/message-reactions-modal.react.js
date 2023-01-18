// @flow

import _sortBy from 'lodash/fp/sortBy';
import * as React from 'react';

import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForUserExplicit } from 'lib/shared/user-utils';

import Modal from '../modal.react';
import css from './message-reactions-modal.css';

type MessageReactionListInfo = {
  +id: string,
  +isViewer: boolean,
  +reaction: string,
  +username: string,
};

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

    const sortedResult = _sortBy(
      ([
        (reactionInfo: MessageReactionListInfo) => {
          const numOfReactions = reactions.get(reactionInfo.reaction)?.users
            .length;

          return numOfReactions ? -numOfReactions : 0;
        },
        'username',
      ]: $ReadOnlyArray<
        ((reactionInfo: MessageReactionListInfo) => mixed) | string,
      >),
    )(result);

    return sortedResult.map(messageReactionUser => (
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
