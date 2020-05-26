// @flow

import * as React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, { Easing } from 'react-native-reanimated';

/* eslint-disable import/no-named-as-default-member */
const { Value, timing, interpolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

const expandedHeight = Platform.select({
  android: 29.5,
  default: 27,
});

type Props = {|
  visible: boolean,
|};
function DisconnectedBar(props: Props) {
  const showingRef = new React.useRef();
  if (!showingRef.current) {
    showingRef.current = new Value(0);
  }
  const showing = showingRef.current;

  const { visible } = props;
  const changeShowing = React.useCallback(
    toValue => {
      if (!visible) {
        showing.setValue(toValue);
        return;
      }
      timing(showing, {
        toValue,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      }).start();
    },
    [visible, showing],
  );

  const shouldShowDisconnectedBar = useSelector(
    state => state.connection.showDisconnectedBar,
  );
  const prevShowDisconnectedBar = React.useRef();
  React.useEffect(() => {
    const wasShowing = prevShowDisconnectedBar.current;
    if (shouldShowDisconnectedBar && !wasShowing) {
      changeShowing(1);
    } else if (!shouldShowDisconnectedBar && wasShowing) {
      changeShowing(0);
    }
    prevShowDisconnectedBar.current = shouldShowDisconnectedBar;
  }, [shouldShowDisconnectedBar, changeShowing]);

  const height = React.useMemo(
    () =>
      interpolate(showing, {
        inputRange: [0, 1],
        outputRange: [0, expandedHeight],
      }),
    [showing],
  );
  const containerStyle = React.useMemo(
    () => ({
      height,
      ...styles.container,
    }),
    [height],
  );

  return (
    <Animated.View style={containerStyle} pointerEvents="none">
      <Text style={styles.text} numberOfLines={1}>
        DISCONNECTED
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#CC0000',
    overflow: 'hidden',
  },
  text: {
    color: 'white',
    fontSize: 14,
    padding: 5,
    textAlign: 'center',
  },
});

export default DisconnectedBar;
