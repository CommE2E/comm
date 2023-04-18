// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { ResolvedClientAvatar } from 'lib/types/avatar-types.js';

import Multimedia from '../media/multimedia.react.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +avatarInfo: ResolvedClientAvatar,
  +size: 'micro' | 'small' | 'large' | 'profile',
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

  const shouldRenderAvatars = useShouldRenderAvatars();

  const containerSizeStyle = React.useMemo(() => {
    if (size === 'micro') {
      return styles.micro;
    } else if (size === 'small') {
      return styles.small;
    } else if (size === 'large') {
      return styles.large;
    }
    return styles.profile;
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
    if (size === 'micro') {
      return styles.emojiMicro;
    } else if (size === 'small') {
      return styles.emojiSmall;
    } else if (size === 'large') {
      return styles.emojiLarge;
    }
    return styles.emojiProfile;
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

  return shouldRenderAvatars ? avatar : null;
}

const styles = StyleSheet.create({
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiLarge: {
    fontSize: 28,
    textAlign: 'center',
  },
  emojiMicro: {
    fontSize: 9,
    textAlign: 'center',
  },
  emojiProfile: {
    fontSize: 80,
    textAlign: 'center',
  },
  emojiSmall: {
    fontSize: 14,
    textAlign: 'center',
  },
  imageContainer: {
    overflow: 'hidden',
  },
  large: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  micro: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  profile: {
    borderRadius: 56,
    height: 112,
    width: 112,
  },
  small: {
    borderRadius: 12,
    height: 24,
    width: 24,
  },
});

export default Avatar;
