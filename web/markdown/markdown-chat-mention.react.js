// @flow

import * as React from 'react';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import css from './markdown.css';
import { useOnClickThread } from '../selectors/thread-selectors.js';

type MarkdownSpoilerProps = {
  +threadInfo: ResolvedThreadInfo,
  +hasAccessToChat: boolean,
  +text: string,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const { threadInfo, hasAccessToChat, text } = props;
  const onClick = useOnClickThread(threadInfo);

  if (!hasAccessToChat) {
    return text;
  }

  return (
    <strong className={css.chatMention} onClick={onClick}>
      {text}
    </strong>
  );
}

const MemoizedMarkdownSpoiler: React.ComponentType<MarkdownSpoilerProps> =
  React.memo<MarkdownSpoilerProps>(MarkdownSpoiler);

export default MemoizedMarkdownSpoiler;
