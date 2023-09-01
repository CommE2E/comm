// @flow

import * as React from 'react';

import css from './markdown.css';

type MarkdownChatMentionProps = {
  +hasAccessToChat: boolean,
  +text: string,
};

function MarkdownChatMention(props: MarkdownChatMentionProps): React.Node {
  const { hasAccessToChat, text } = props;

  if (!hasAccessToChat) {
    return text;
  }

  return <a className={css.chatMention}>{text}</a>;
}

export default MarkdownChatMention;
