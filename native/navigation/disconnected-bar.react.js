// @flow

import * as React from 'react';
import { Text, Platform, Animated, Easing } from 'react-native';

import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

const expandedHeight = Platform.select({
  android: 29.5,
  default: 27,
});
const timingConfig = {
  useNativeDriver: false,
  duration: 200,
  easing: Easing.inOut(Easing.ease),
};

type Props = {
  +visible: boolean,
};
function DisconnectedBar(props: Props): React.Node {
  const networkConnected = useSelector(state => state.connectivity.connected);
  const showingRef = React.useRef<?Animated.Value>();
  if (!showingRef.current) {
    showingRef.current = new Animated.Value(networkConnected ? 0 : 1);
  }
  const showing = showingRef.current;

  const { visible } = props;
  React.useEffect(() => {
    if (!visible) {
      showing.setValue(networkConnected ? 0 : 1);
    } else {
      Animated.timing(showing, {
        ...timingConfig,
        toValue: networkConnected ? 0 : 1,
      }).start();
    }
  }, [networkConnected, showing, visible]);

  const heightStyle = React.useMemo(
    () => ({
      height: showing.interpolate({
        inputRange: [0, 1],
        outputRange: ([0, expandedHeight]: number[]), // Flow...
      }),
    }),
    [showing],
  );

  const styles = useStyles(unboundStyles);
  const containerStyle = React.useMemo(
    () => [styles.disconnected, heightStyle],
    [heightStyle, styles.disconnected],
  );

  return (
    <Animated.View style={containerStyle} pointerEvents="none">
      <Text style={styles.disconnectedText} numberOfLines={1}>
        DISCONNECTED
      </Text>
    </Animated.View>
  );
}

const unboundStyles = {
  disconnected: {
    backgroundColor: 'disconnectedBarBackground',
    overflow: 'hidden',
  },
  disconnectedText: {
    color: 'panelForegroundLabel',
    fontSize: 14,
    padding: 5,
    textAlign: 'center',
  },
};

export default DisconnectedBar;
