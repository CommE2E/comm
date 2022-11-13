// @flow

import * as React from 'react';
import { Text, Platform, Animated, Easing } from 'react-native';

import {
  useDisconnectedBar,
  useShouldShowDisconnectedBar,
} from 'lib/hooks/disconnected-bar';

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

type Props = {
  +visible: boolean,
};
function DisconnectedBar(props: Props): React.Node {
  const { shouldShowDisconnectedBar } = useShouldShowDisconnectedBar();
  const showingRef = React.useRef();
  if (!showingRef.current) {
    showingRef.current = new Animated.Value(shouldShowDisconnectedBar ? 1 : 0);
  }
  const showing = showingRef.current;

  const { visible } = props;
  const changeShowing = React.useCallback(
    (toState: boolean) => {
      const toValue = toState ? 1 : 0;
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

  const barCause = useDisconnectedBar(changeShowing);

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
