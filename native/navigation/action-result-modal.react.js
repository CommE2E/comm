// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSelector } from '../redux/redux-utils';
import { useOverlayStyles } from '../themes/colors';
import type { AppNavigationProp } from './app-navigator.react';
import { OverlayContext } from './overlay-context';
import type { NavigationRoute } from './route-names';

export type ActionResultModalParams = {
  +message: string,
  +preventPresses: true,
};

type Props = {
  +navigation: AppNavigationProp<'ActionResultModal'>,
  +route: NavigationRoute<'ActionResultModal'>,
};
function ActionResultModal(props: Props): React.Node {
  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'ActionResultModal should have OverlayContext');
  const { position } = overlayContext;

  // Timer resets whenever message updates
  const { goBackOnce } = props.navigation;
  const { message } = props.route.params;
  React.useEffect(() => {
    const timeoutID = setTimeout(goBackOnce, 2000);
    return () => clearTimeout(timeoutID);
  }, [message, goBackOnce]);

  const styles = useOverlayStyles(ourStyles);
  const bottomInset = useSelector(state => state.dimensions.bottomInset);
  const containerStyle = {
    ...styles.container,
    opacity: position,
    paddingBottom: bottomInset + 100,
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
