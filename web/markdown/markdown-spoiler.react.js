// @flow

import * as React from 'react';

import type { ReactElement } from 'lib/shared/markdown';

type MarkdownSpoilerProps = {
  +text: ReactElement,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const { text } = props;

  return <span>{text}</span>;
}

const MemoizedMarkdownSpoiler: React.ComponentType<MarkdownSpoilerProps> = React.memo<MarkdownSpoilerProps>(
  MarkdownSpoiler,
);

export default MemoizedMarkdownSpoiler;
