// @flow

import * as React from 'react';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import css from './markdown.css';

type MarkdownChatMentionProps = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +text: string,
};

function MarkdownChatMention(props: MarkdownChatMentionProps): React.Node {
  const { hasAccessToChat, text } = props;

  if (!hasAccessToChat) {
    return text;
  }

  return (
    <a className={css.chatMention}>
      <strong>{text}</strong>
    </a>
  );
}

const MemoizedMarkdownChatMention: React.ComponentType<MarkdownChatMentionProps> =
  React.memo<MarkdownChatMentionProps>(MarkdownChatMention);

export default MemoizedMarkdownChatMention;
