// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { ClientAvatar } from 'lib/types/avatar-types';

import css from './avatar.css';

type Props = {
  +avatarInfo: ClientAvatar,
  +size: 'large' | 'small' | 'profile' | 'micro',
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

  const containerSizeClassName = classnames({
    [css.profile]: size === 'profile',
    [css.large]: size === 'large',
    [css.small]: size === 'small',
    [css.micro]: size === 'micro',
  });

  const emojiSizeClassName = classnames({
    [css.emojiContainer]: true,
    [css.emojiProfile]: size === 'profile',
    [css.emojiLarge]: size === 'large',
    [css.emojiSmall]: size === 'small',
    [css.emojiMicro]: size === 'micro',
  });

  const emojiContainerColorStyle = React.useMemo(() => {
    if (avatarInfo.type === 'emoji') {
      return { backgroundColor: `#${avatarInfo.color}` };
    }
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

  return <React.Fragment>{avatar}</React.Fragment>;
}

export default Avatar;
