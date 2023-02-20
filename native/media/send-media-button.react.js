// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';

import type { ViewStyle } from '../types/styles.js';

type Props = {
  ...React.ElementConfig<typeof View>,
  +onPress: () => mixed,
  +queueCount?: number,
  +containerStyle?: ViewStyle,
  +style?: ViewStyle,
};
function SendMediaButton(props: Props): React.Node {
  const { onPress, queueCount, containerStyle, style, ...containerProps } =
    props;

  let queueCountText = null;
  if (queueCount !== undefined && queueCount !== null) {
    queueCountText = (
      <View style={styles.queueCountBubble}>
        <Text style={styles.queueCountText}>{queueCount}</Text>
      </View>
    );
  }

  return (
    <View {...containerProps} style={containerStyle}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        <Animated.View style={[styles.sendButton, style]}>
          <Icon name="send" style={styles.sendIcon} />
          {queueCountText}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  queueCountBubble: {
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 25,
    height: 25,
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'android' ? 2 : 0,
    paddingLeft: 1,
    position: 'absolute',
    right: -8,
    top: -8,
    width: 25,
  },
  queueCountText: {
    color: 'white',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: '#7ED321',
    borderColor: 'white',
    borderRadius: 30,
    borderWidth: 4,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 16,
    paddingTop: 14,
  },
  sendIcon: {
    color: 'white',
    fontSize: 22,
  },
});

export default SendMediaButton;
