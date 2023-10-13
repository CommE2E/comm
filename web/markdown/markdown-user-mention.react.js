// @flow

import * as React from 'react';

import css from './markdown.css';
import { usePushUserProfileModal } from '../modals/user-profile/user-profile-utils.js';

type MarkdownChatMentionProps = {
  +text: string,
  +userID: string,
};

function MarkdownUserMention(props: MarkdownChatMentionProps): React.Node {
  const { text, userID } = props;

  const pushUserProfileModal = usePushUserProfileModal(userID);

  const markdownUserMention = React.useMemo(
    () => (
      <a className={css.mention} onClick={pushUserProfileModal}>
        {text}
      </a>
    ),
    [pushUserProfileModal, text],
  );

  return markdownUserMention;
}

export default MarkdownUserMention;
