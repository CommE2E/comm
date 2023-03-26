// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { ClientAvatar } from 'lib/types/avatar-types.js';

import RemoteImage from '../media/remote-image.react.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

type Props = {
  +avatarInfo: ClientAvatar,
  +size?: 'large' | 'small' | 'profile' | 'micro',
};

function Avatar(props: Props): React.Node {
  const { avatarInfo, size } = props;

  const shouldRenderAvatars = useShouldRenderAvatars();

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
    const containerStyles = [styles.emojiContainer, containerSizeStyle];
    if (avatarInfo.type === 'emoji') {
      const backgroundColor = { backgroundColor: `#${avatarInfo.color}` };
      containerStyles.push(backgroundColor);
    }

    return containerStyles;
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

  const onRemoteImageLoad = React.useCallback(() => {
    // TODO:
    // Either make onLoad prop optional for RemoteImage or figure out
    // what we need to consider when an image is loaded.
    //
    // From what I understand about the RemoteImage component, the Avatar
    // component shouldn't need a departingURI state (from the Mutlimedia
    // component) or similar logic since there is no transition between
    // multiple avatars. When the avatar image changes, the component will
    // just rerender with a loading state while the image uploads, and then
    // then the Avatar component will rerender again with the new uploaded
    // image.
  }, []);

  const avatar = React.useMemo(() => {
    if (avatarInfo.type === 'image') {
      return (
        <RemoteImage
          uri={avatarInfo.uri}
          onLoad={onRemoteImageLoad}
          spinnerColor="black"
          style={containerSizeStyle}
          invisibleLoad={true}
          key={avatarInfo.uri}
        />
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
    onRemoteImageLoad,
  ]);

  if (!shouldRenderAvatars) {
    return null;
  }

  return <React.Fragment>{avatar}</React.Fragment>;
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
