// @flow

import classnames from 'classnames';
import * as React from 'react';

import type {
  ResolvedClientAvatar,
  AvatarSize,
} from 'lib/types/avatar-types.js';

import css from './avatar.css';
import LoadingIndicator from '../loading-indicator.react.js';
import EncryptedMultimedia from '../media/encrypted-multimedia.react.js';

type Props = {
  +avatarInfo: ResolvedClientAvatar,
  +size: AvatarSize,
  +showSpinner?: boolean,
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size, showSpinner } = props;

  let loadingIndicatorSize;
  if (size === 'XS') {
    loadingIndicatorSize = 'small';
  } else if (size === 'S') {
    loadingIndicatorSize = 'small';
  } else if (size === 'M') {
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

  const containerSizeClassName = classnames({
    [css.imgContainer]: avatarInfo.type === 'image',
    [css.xSmall]: size === 'XS',
    [css.small]: size === 'S',
    [css.medium]: size === 'M',
    [css.large]: size === 'L',
    [css.xLarge]: size === 'XL',
    [css.xxLarge]: size === 'XXL',
  });

  const emojiSizeClassName = classnames({
    [css.emojiContainer]: true,
    [css.emojiXSmall]: size === 'XS',
    [css.emojiSmall]: size === 'S',
    [css.emojiMedium]: size === 'M',
    [css.emojiLarge]: size === 'L',
    [css.emojiXLarge]: size === 'XL',
    [css.emojiXXLarge]: size === 'XXL',
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
    } else if (avatarInfo.type === 'encrypted_image') {
      return (
        <EncryptedMultimedia
          type="encrypted_photo"
          blobURI={avatarInfo.blobURI}
          encryptionKey={avatarInfo.encryptionKey}
          multimediaClassName={containerSizeClassName}
          loadingIndicatorComponent={loadingIndicator}
          invisibleLoad={showSpinner}
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
    avatarInfo.blobURI,
    avatarInfo.encryptionKey,
    showSpinner,
    loadingIndicator,
    containerSizeClassName,
    emojiContainerColorStyle,
    emojiSizeClassName,
  ]);

  return (
    <div className={css.avatarContainer}>
      {showSpinner ? loadingIndicator : null}
      {avatar}
    </div>
  );
}

export default Avatar;
