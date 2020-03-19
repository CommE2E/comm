// @flow

import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Animated from 'react-native-reanimated';

type Props = {|
  onPress: () => mixed,
  queueCount?: number,
  containerStyle?: ViewStyle,
  style?: ViewStyle,
  ...$Shape<React.ElementProps<typeof View>>,
|};
function SendMediaButton(props: Props) {
  const {
    onPress,
    queueCount,
    containerStyle,
    style,
    ...containerProps
  } = props;

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
  sendButton: {
    backgroundColor: '#7ED321',
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 4,
    borderColor: 'white',
  },
  sendIcon: {
    color: 'white',
    fontSize: 22,
  },
  queueCountBubble: {
    backgroundColor: '#222222',
    position: 'absolute',
    top: -8,
    right: -8,
    width: 25,
    height: 25,
    paddingLeft: 1,
    paddingBottom: Platform.OS === 'android' ? 2 : 0,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueCountText: {
    textAlign: 'center',
    color: 'white',
  },
});

export default SendMediaButton;
