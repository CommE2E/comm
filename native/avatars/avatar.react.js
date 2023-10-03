// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type {
  ResolvedClientAvatar,
  AvatarSize,
} from 'lib/types/avatar-types.js';

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
    if (avatarInfo.type === 'image') {
      const avatarMediaInfo = {
        type: 'photo',
        uri: avatarInfo.uri,
      };

      return (
        <View style={[containerSizeStyle, styles.imageContainer]}>
          <Multimedia mediaInfo={avatarMediaInfo} spinnerColor="white" />
        </View>
      );
    }

    return (
      <View style={emojiContainerStyle}>
        <Text style={emojiSizeStyle}>{avatarInfo.emoji}</Text>
      </View>
    );
  }, [
    avatarInfo.emoji,
    avatarInfo.type,
    avatarInfo.uri,
    containerSizeStyle,
    emojiContainerStyle,
    emojiSizeStyle,
  ]);

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
    borderRadius: 45,
    height: 90,
    width: 90,
  },
  medium: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  small: {
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  xLarge: {
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  xSmall: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  xxLarge: {
    borderRadius: 112,
    height: 224,
    width: 224,
  },
});

export default Avatar;
