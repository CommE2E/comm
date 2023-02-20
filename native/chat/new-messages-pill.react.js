// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import { TouchableOpacity, View, Text, Platform, Animated } from 'react-native';

import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type Props = {
  +onPress: () => mixed,
  +newMessageCount: number,
  +containerStyle?: ViewStyle,
  +style?: ViewStyle,
  ...React.ElementConfig<typeof View>,
};
function NewMessagesPill(props: Props): React.Node {
  const { onPress, newMessageCount, containerStyle, style, ...containerProps } =
    props;
  const styles = useStyles(unboundStyles);
  return (
    <View {...containerProps} style={containerStyle}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <Animated.View style={[styles.button, style]}>
          <Icon name="angle-double-down" style={styles.icon} />
          <View style={styles.countBubble}>
            <Text style={styles.countText}>{newMessageCount}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  countBubble: {
    alignItems: 'center',
    backgroundColor: 'vibrantGreenButton',
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
  countText: {
    color: 'white',
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'floatingButtonBackground',
    borderColor: 'floatingButtonLabel',
    borderRadius: 30,
    borderWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: {
    color: 'floatingButtonLabel',
    fontSize: 32,
    fontWeight: 'bold',
  },
};

export default NewMessagesPill;
