// @flow

import * as React from 'react';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import css from './markdown.css';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type MarkdownChatMentionProps = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +text: string,
};

function MarkdownChatMention(props: MarkdownChatMentionProps): React.Node {
  const { threadInfo, hasAccessToChat, text } = props;
  const onClick = useOnClickThread(threadInfo);

  if (!hasAccessToChat) {
    return text;
  }

  return (
    <strong>
      <a className={css.chatMention} onClick={onClick}>
        {text}
      </a>
    </strong>
  );
}

export default MarkdownChatMention;
