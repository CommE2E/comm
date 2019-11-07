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
|};
function SendMediaButton(props: Props) {
  let queueCount = null;
  if (props.queueCount !== undefined && props.queueCount !== null) {
    queueCount = (
      <View style={styles.queueCountBubble}>
        <Text style={styles.queueCountText}>
          {props.queueCount}
        </Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={props.onPress}
      activeOpacity={0.6}
      style={props.containerStyle}
    >
      <Animated.View style={[ styles.sendButton, props.style ]}>
        <Icon name="send" style={styles.sendIcon} />
        {queueCount}
      </Animated.View>
    </TouchableOpacity>
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
    paddingBottom: Platform.OS === "android" ? 2 : 0,
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
