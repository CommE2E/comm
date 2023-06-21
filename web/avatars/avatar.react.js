// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { ResolvedClientAvatar } from 'lib/types/avatar-types.js';

import css from './avatar.css';
import LoadingIndicator from '../loading-indicator.react.js';

type Props = {
  +avatarInfo: ResolvedClientAvatar,
  +size: 'micro' | 'small' | 'large' | 'profile',
  +showSpinner?: boolean,
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size, showSpinner } = props;

  const containerSizeClassName = classnames({
    [css.imgContainer]: avatarInfo.type === 'image',
    [css.micro]: size === 'micro',
    [css.small]: size === 'small',
    [css.large]: size === 'large',
    [css.profile]: size === 'profile',
  });

  const emojiSizeClassName = classnames({
    [css.emojiContainer]: true,
    [css.emojiMicro]: size === 'micro',
    [css.emojiSmall]: size === 'small',
    [css.emojiLarge]: size === 'large',
    [css.emojiProfile]: size === 'profile',
  });

  const emojiContainerColorStyle = React.useMemo(() => {
    if (avatarInfo.type === 'emoji') {
      return { backgroundColor: `#${avatarInfo.color}` };
    }
    return undefined;
  }, [avatarInfo.color, avatarInfo.type]);

  const avatar = React.useMemo(() => {
    if (avatarInfo.type === 'image') {
      return (
        <img
          src={avatarInfo.uri}
          alt="image avatar"
          className={containerSizeClassName}
        />
      );
    }

    return (
      <div className={containerSizeClassName} style={emojiContainerColorStyle}>
        <div className={emojiSizeClassName}>{avatarInfo.emoji}</div>
      </div>
    );
  }, [
    avatarInfo.emoji,
    avatarInfo.type,
    avatarInfo.uri,
    containerSizeClassName,
    emojiContainerColorStyle,
    emojiSizeClassName,
  ]);

  let loadingIndicatorSize;
  if (size === 'micro') {
    loadingIndicatorSize = 'small';
  } else if (size === 'small') {
    loadingIndicatorSize = 'small';
  } else if (size === 'large') {
    loadingIndicatorSize = 'medium';
  } else {
    loadingIndicatorSize = 'large';
  }

  const loadingIndicator = React.useMemo(
    () => (
      <div className={css.editAvatarLoadingSpinner}>
        <LoadingIndicator status="loading" size={loadingIndicatorSize} />
      </div>
    ),
    [loadingIndicatorSize],
  );

  return (
    <div className={css.avatarContainer}>
      {showSpinner ? loadingIndicator : null}
      {avatar}
    </div>
  );
}

export default Avatar;
