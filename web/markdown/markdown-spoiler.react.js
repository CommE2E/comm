// @flow

import * as React from 'react';

import type { ReactElement } from 'lib/shared/markdown';

import css from './markdown.css';

type MarkdownSpoilerProps = {
  +text: ReactElement,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const { text } = props;

  return <span className={css.spoiler}>{text}</span>;
}

const MemoizedMarkdownSpoiler: React.ComponentType<MarkdownSpoilerProps> = React.memo<MarkdownSpoilerProps>(
  MarkdownSpoiler,
);

export default MemoizedMarkdownSpoiler;
