// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type {
  ResolvedClientAvatar,
  AvatarSize,
} from 'lib/types/avatar-types.js';

import {
  xSmallAvatarSize,
  smallAvatarSize,
  mediumAvatarSize,
  largeAvatarSize,
  xLargeAvatarSize,
  xxLargeAvatarSize,
} from './avatar-constants.js';
import Multimedia from '../media/multimedia.react.js';

type Props = {
  +avatarInfo: ResolvedClientAvatar,
  +size: AvatarSize,
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

  const containerSizeStyle = React.useMemo(() => {
    if (size === 'XS') {
      return styles.xSmall;
    } else if (size === 'S') {
      return styles.small;
    } else if (size === 'M') {
      return styles.medium;
    } else if (size === 'L') {
      return styles.large;
    } else if (size === 'XL') {
      return styles.xLarge;
    }
    return styles.xxLarge;
  }, [size]);

  const emojiContainerStyle = React.useMemo(() => {
    const containerStyles = [styles.emojiContainer, containerSizeStyle];
    if (avatarInfo.type === 'emoji') {
      const backgroundColor = { backgroundColor: `#${avatarInfo.color}` };
      containerStyles.push(backgroundColor);
    }

    return containerStyles;
  }, [avatarInfo, containerSizeStyle]);

  const emojiSizeStyle = React.useMemo(() => {
    if (size === 'XS') {
      return styles.emojiXSmall;
    } else if (size === 'S') {
      return styles.emojiSmall;
    } else if (size === 'M') {
      return styles.emojiMedium;
    } else if (size === 'L') {
      return styles.emojiLarge;
    } else if (size === 'XL') {
      return styles.emojiXLarge;
    }
    return styles.emojiXXLarge;
  }, [size]);

  const avatar = React.useMemo(() => {
    if (avatarInfo.type !== 'image' && avatarInfo.type !== 'encrypted_image') {
      return (
        <View style={emojiContainerStyle}>
          <Text style={emojiSizeStyle}>{avatarInfo.emoji}</Text>
        </View>
      );
    }

    let avatarMediaInfo;
    if (avatarInfo.type === 'encrypted_image') {
      avatarMediaInfo = avatarInfo;
    } else if (avatarInfo.type === 'image') {
      avatarMediaInfo = {
        type: 'photo',
        uri: avatarInfo.uri,
      };
    } else {
      return null;
    }

    return (
      <View style={[containerSizeStyle, styles.imageContainer]}>
        <Multimedia mediaInfo={avatarMediaInfo} spinnerColor="white" />
      </View>
    );
  }, [avatarInfo, containerSizeStyle, emojiContainerStyle, emojiSizeStyle]);

  return avatar;
}

const styles = StyleSheet.create({
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiLarge: {
    fontSize: 64,
    textAlign: 'center',
  },
  emojiMedium: {
    fontSize: 28,
    textAlign: 'center',
  },
  emojiSmall: {
    fontSize: 14,
    textAlign: 'center',
  },
  emojiXLarge: {
    fontSize: 80,
    textAlign: 'center',
  },
  emojiXSmall: {
    fontSize: 9,
    textAlign: 'center',
  },
  emojiXXLarge: {
    fontSize: 176,
    textAlign: 'center',
  },
  imageContainer: {
    overflow: 'hidden',
  },
  large: {
    borderRadius: largeAvatarSize / 2,
    height: largeAvatarSize,
    width: largeAvatarSize,
  },
  medium: {
    borderRadius: mediumAvatarSize / 2,
    height: mediumAvatarSize,
    width: mediumAvatarSize,
  },
  small: {
    borderRadius: smallAvatarSize / 2,
    height: smallAvatarSize,
    width: smallAvatarSize,
  },
  xLarge: {
    borderRadius: xLargeAvatarSize / 2,
    height: xLargeAvatarSize,
    width: xLargeAvatarSize,
  },
  xSmall: {
    borderRadius: xSmallAvatarSize / 2,
    height: xSmallAvatarSize,
    width: xSmallAvatarSize,
  },
  xxLarge: {
    borderRadius: xxLargeAvatarSize / 2,
    height: xxLargeAvatarSize,
    width: xxLargeAvatarSize,
  },
});

export default Avatar;
