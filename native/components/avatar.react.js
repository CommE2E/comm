// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { EmojiAvatar } from 'lib/types/avatar-types.js';

type Props = {
  +avatarInfo: EmojiAvatar,
  +size?: 'large' | 'small' | 'profile' | 'micro',
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

  const containerSizeStyle = React.useMemo(() => {
    if (size === 'profile') {
      return styles.profile;
    } else if (size === 'small') {
      return styles.small;
    } else if (size === 'micro') {
      return styles.micro;
    }
    return styles.large;
  }, [size]);

  const emojiContainerStyle = React.useMemo(() => {
    const backgroundColor = { backgroundColor: `#${avatarInfo.color}` };

    return [styles.emojiContainer, containerSizeStyle, backgroundColor];
  }, [avatarInfo, containerSizeStyle]);

  const emojiSizeStyle = React.useMemo(() => {
    if (size === 'profile') {
      return styles.emojiProfile;
    } else if (size === 'small') {
      return styles.emojiSmall;
    } else if (size === 'micro') {
      return styles.emojiMicro;
    }
    return styles.emojiLarge;
  }, [size]);

  return (
    <View style={emojiContainerStyle}>
      <Text style={emojiSizeStyle}>{avatarInfo.emoji}</Text>
    </View>
  );
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
