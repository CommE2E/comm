// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './message-like-tooltip-button.css';

type ReactTooltipButtonProps = {
  +viewerReacted: boolean,
};

function MessageLikeTooltipButton(props: ReactTooltipButtonProps): React.Node {
  const { viewerReacted } = props;

  const containerClassNames = classNames({
    [css.containerViewerLiked]: viewerReacted,
  });

  return <span className={containerClassNames}>👍</span>;
}

export default MessageLikeTooltipButton;
