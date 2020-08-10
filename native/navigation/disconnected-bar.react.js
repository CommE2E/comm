// @flow

import * as React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, { Easing } from 'react-native-reanimated';

const expandedHeight = Platform.select({
  android: 29.5,
  default: 27,
});
const timingConfig = {
  duration: 200,
  easing: Easing.inOut(Easing.ease),
};

type Props = {|
  visible: boolean,
|};
function DisconnectedBar(props: Props) {
  const shouldShowDisconnectedBar = useSelector(
    state => state.connection.showDisconnectedBar,
  );

  const showingRef = new React.useRef();
  if (!showingRef.current) {
    showingRef.current = new Animated.Value(shouldShowDisconnectedBar ? 1 : 0);
  }
  const showing = showingRef.current;

  const { visible } = props;
  const changeShowing = React.useCallback(
    toValue => {
      if (!visible) {
        showing.setValue(toValue);
        return;
      }
      Animated.timing(showing, {
        ...timingConfig,
        toValue,
      }).start();
    },
    [visible, showing],
  );

  const prevShowDisconnectedBar = React.useRef();
  React.useEffect(() => {
    const wasShowing = prevShowDisconnectedBar.current;
    if (shouldShowDisconnectedBar && wasShowing === false) {
      changeShowing(1);
    } else if (!shouldShowDisconnectedBar && wasShowing) {
      changeShowing(0);
    }
    prevShowDisconnectedBar.current = shouldShowDisconnectedBar;
  }, [shouldShowDisconnectedBar, changeShowing]);

  const heightStyle = React.useMemo(
    () => ({
      height: showing.interpolate({
        inputRange: [0, 1],
        outputRange: [0, expandedHeight],
      }),
    }),
    [showing],
  );

  return (
    <Animated.View style={[styles.container, heightStyle]} pointerEvents="none">
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
