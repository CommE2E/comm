// @flow

import * as React from 'react';
import { Text, Platform, Animated, Easing } from 'react-native';

import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';

const expandedHeight = Platform.select({
  android: 29.5,
  default: 27,
});
const timingConfig = {
  useNativeDriver: false,
  duration: 200,
  easing: Easing.inOut(Easing.ease),
};

type Props = {|
  +visible: boolean,
|};
function DisconnectedBar(props: Props) {
  const disconnected = useSelector(
    state => state.connection.showDisconnectedBar,
  );
  const socketConnected = useSelector(
    state => state.connection.status === 'connected',
  );
  const shouldShowDisconnectedBar = disconnected || !socketConnected;

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
        outputRange: ([0, expandedHeight]: number[]), // Flow...
      }),
    }),
    [showing],
  );

  const [barCause, setBarCause] = React.useState('connecting');
  React.useEffect(() => {
    if (shouldShowDisconnectedBar && disconnected) {
      setBarCause('disconnected');
    } else if (shouldShowDisconnectedBar) {
      setBarCause('connecting');
    }
  }, [shouldShowDisconnectedBar, disconnected]);

  const styles = useStyles(unboundStyles);
  const text = barCause === 'disconnected' ? 'DISCONNECTED' : 'CONNECTING…';
  const viewStyle =
    barCause === 'disconnected' ? styles.disconnected : styles.connecting;
  const textStyle =
    barCause === 'disconnected'
      ? styles.disconnectedText
      : styles.connectingText;

  return (
    <Animated.View style={[viewStyle, heightStyle]} pointerEvents="none">
      <Text style={textStyle} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

const unboundStyles = {
  disconnected: {
    backgroundColor: '#CC0000',
    overflow: 'hidden',
  },
  connecting: {
    backgroundColor: 'disconnectedBarBackground',
    overflow: 'hidden',
  },
  disconnectedText: {
    color: 'white',
    fontSize: 14,
    padding: 5,
    textAlign: 'center',
  },
  connectingText: {
    color: 'panelForegroundLabel',
    fontSize: 14,
    padding: 5,
    textAlign: 'center',
  },
};

export default DisconnectedBar;
