// @flow

import * as React from 'react';

import type { ReactElement } from 'lib/shared/markdown.js';

import css from './markdown.css';

type MarkdownSpoilerProps = {
  +text: ReactElement,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const { text } = props;

  const [isRevealed, setIsRevealed] = React.useState(false);

  const styleBasedOnSpoilerState = React.useMemo(() => {
    if (isRevealed) {
      return css.revealSpoilerAnimation;
    }
    return css.spoiler;
  }, [isRevealed]);

  const onSpoilerClick = React.useCallback(() => {
    setIsRevealed(true);
  }, [setIsRevealed]);

  return (
    <span className={styleBasedOnSpoilerState} onClick={onSpoilerClick}>
      {text}
    </span>
  );
}

const MemoizedMarkdownSpoiler: React.ComponentType<MarkdownSpoilerProps> =
  React.memo<MarkdownSpoilerProps>(MarkdownSpoiler);

export default MemoizedMarkdownSpoiler;
