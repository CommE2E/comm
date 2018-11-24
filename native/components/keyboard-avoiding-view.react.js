// @flow

import type { ViewStyle } from '../types/styles';
import type { EmitterSubscription } from '../keyboard';

import * as React from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  View,
  ViewPropTypes,
  AppState,
} from 'react-native';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';

type ViewLayout = {
  y: number,
  height: number,
};
type ViewLayoutEvent = { nativeEvent: { layout: ViewLayout } };

type ScreenRect = {
  screenX: number,
  screenY: number,
  width: number,
  height: number,
};
type KeyboardChangeEvent = {
  startCoordinates?: ScreenRect,
  endCoordinates: ScreenRect,
  duration?: number,
  easing?: string,
};

type Props = {|
  children?: React.Node,
  style?: ViewStyle,
|};
type State = {|
  bottom: number,
|};
class KeyboardAvoidingView extends React.PureComponent<Props, State> {

  static propTypes = {
    children: PropTypes.node,
    style: ViewPropTypes.style,
  };
  state = {
    bottom: 0,
  };
  keyboardSubscription: ?EmitterSubscription = null;
  frame: ?ViewLayout = null;
  currentState = AppState.currentState;

  relativeKeyboardHeight(keyboardFrame: ScreenRect): number {
    const { frame } = this;
    if (!frame || !keyboardFrame) {
      return 0;
    }
    // Calculate the displacement needed for the view such that it
    // no longer overlaps with the keyboard
    return Math.max(frame.y + frame.height - keyboardFrame.screenY, 0);
  }

  onKeyboardChange = (event: ?KeyboardChangeEvent) => {
    if (this.currentState !== "active") {
      return;
    }

    if (!event) {
      this.setState({ bottom: 0 });
      return;
    }

    if (_isEqual(event.startCoordinates)(event.endCoordinates)) {
      return;
    }

    const { duration, easing, endCoordinates } = event;
    const height = this.relativeKeyboardHeight(endCoordinates);

    if (this.state.bottom === height) {
      return;
    }

    if (duration && easing) {
      LayoutAnimation.configureNext({
        duration: duration,
        update: {
          duration: duration,
          type: LayoutAnimation.Types[easing] || 'keyboard',
        },
      });
    }
    this.setState({ bottom: height });
  }

  onLayout = (event: ViewLayoutEvent) => {
    this.frame = event.nativeEvent.layout;
  }

  handleAppStateChange = (nextAppState: ?string) => {
    this.currentState = nextAppState;
  }

  componentWillMount() {
    if (Platform.OS !== 'ios') {
      return;
    }
    this.keyboardSubscription = Keyboard.addListener(
      'keyboardWillChangeFrame',
      this.onKeyboardChange,
    );
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillUnmount() {
    if (Platform.OS !== 'ios') {
      return;
    }
    if (this.keyboardSubscription) {
      this.keyboardSubscription.remove();
    }
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  render() {
    const { children, style, ...props } = this.props;

    if (Platform.OS !== "ios") {
      return <View style={style} {...props}>{children}</View>;
    }

    const paddingStyle = { paddingBottom: this.state.bottom };
    return (
      <View
        style={[style, paddingStyle]}
        onLayout={this.onLayout}
        {...props}
      >
        {children}
      </View>
    );
  }

}

export default KeyboardAvoidingView;
