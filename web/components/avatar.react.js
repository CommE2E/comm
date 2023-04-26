// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { ResolvedClientAvatar } from 'lib/types/avatar-types';

import css from './avatar.css';
import { shouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +avatarInfo: ResolvedClientAvatar,
  +size: 'micro' | 'small' | 'large' | 'profile',
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

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

  return shouldRenderAvatars ? avatar : null;
}

export default Avatar;
