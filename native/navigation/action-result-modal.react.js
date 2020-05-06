// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
} from 'react-navigation';

import * as React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import invariant from 'invariant';

import { contentBottomOffset } from '../selectors/dimension-selectors';
import { useOverlayStyles } from '../themes/colors';
import { OverlayContext } from './overlay-navigator.react';

/* eslint-disable import/no-named-as-default-member */
const { Extrapolate, interpolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type NavProp = NavigationStackProp<{|
  ...NavigationLeafRoute,
  params: {|
    message: string,
    preventPresses: true,
  |},
|}>;

type Props = {|
  navigation: NavProp,
|};
function ActionResultModal(props: Props) {
  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'ActionResultModal should have OverlayContext');
  const { position, routeIndex } = overlayContext;
  const progress = React.useMemo(
    () =>
      interpolate(position, {
        inputRange: [routeIndex - 1, routeIndex],
        outputRange: [0, 1],
        extrapolate: Extrapolate.CLAMP,
      }),
    [position, routeIndex],
  );

  // Timer resets whenever message updates
  const { state, goBack } = props.navigation;
  const { message } = state.params;
  React.useEffect(() => {
    const timeoutID = setTimeout(goBack, 2000);
    return () => clearTimeout(timeoutID);
  }, [message, goBack]);

  const styles = useOverlayStyles(ourStyles);
  const containerStyle = {
    ...styles.container,
    opacity: progress,
  };
  return (
    <Animated.View style={containerStyle}>
      <View style={styles.message}>
        <View style={styles.backdrop} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const ourStyles = {
  backdrop: {
    backgroundColor: 'modalContrastBackground',
    bottom: 0,
    left: 0,
    opacity: 'modalContrastOpacity',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: contentBottomOffset + 100,
  },
  message: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
  },
  text: {
    color: 'modalContrastForegroundLabel',
    fontSize: 20,
    textAlign: 'center',
  },
};

export default ActionResultModal;
