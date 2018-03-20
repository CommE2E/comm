// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

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

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';

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
type EmitterSubscription = {
  +remove: () => void,
};

const viewRef = 'VIEW';

type Props = {|
  behavior?: 'height' | 'position' | 'padding',
  children?: React.Node,
  contentContainerStyle?: StyleObj,
  style?: StyleObj,
  keyboardVerticalOffset: number,
|};
type State = {|
  bottom: number,
|};
class KeyboardAvoidingView extends React.PureComponent<Props, State> {

  static propTypes = {
    behavior: PropTypes.oneOf(['height', 'position', 'padding']),
    children: PropTypes.node,
    contentContainerStyle: ViewPropTypes.style,
    style: ViewPropTypes.style,
    keyboardVerticalOffset: PropTypes.number.isRequired,
  };
  static defaultProps = {
    keyboardVerticalOffset: 0,
  };
  state = {
    bottom: 0,
  };
  subscriptions: EmitterSubscription[] = [];
  frame: ?ViewLayout = null;
  currentState = AppState.currentState;

  _relativeKeyboardHeight(keyboardFrame: ScreenRect): number {
    const frame = this.frame;
    if (!frame || !keyboardFrame) {
      return 0;
    }

    const keyboardY = keyboardFrame.screenY - this.props.keyboardVerticalOffset;

    // Calculate the displacement needed for the view such that it
    // no longer overlaps with the keyboard
    return Math.max(frame.y + frame.height - keyboardY, 0);
  }

  _onKeyboardChange = (event: ?KeyboardChangeEvent) => {
    if (this.currentState !== "active") {
      return;
    }

    if (!event) {
      this.setState({bottom: 0});
      return;
    }

    const { duration, easing, endCoordinates } = event;
    const height = this._relativeKeyboardHeight(endCoordinates);

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

  _onLayout = (event: ViewLayoutEvent) => {
    this.frame = event.nativeEvent.layout;
  }

  _handleAppStateChange = (nextAppState: ?string) => {
    this.currentState = nextAppState;
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (
      nextState.bottom === this.state.bottom &&
      this.props.behavior === 'height' &&
      nextProps.behavior === 'height'
    ) {
      nextState.bottom = 0;
    }
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.subscriptions = [
        Keyboard.addListener('keyboardWillChangeFrame', this._onKeyboardChange),
      ];
    } else {
      this.subscriptions = [
        Keyboard.addListener('keyboardDidHide', this._onKeyboardChange),
        Keyboard.addListener('keyboardDidShow', this._onKeyboardChange),
      ];
    }
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    this.subscriptions.forEach((sub) => sub.remove());
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  render() {
    const { behavior, children, style, ...props } = this.props;

    switch (behavior) {
      case 'height':
        let heightStyle;
        if (this.frame) {
          // Note that we only apply a height change when there is keyboard
          // present, i.e. this.state.bottom is greater than 0. If we remove
          // that condition, this.frame.height will never go back to its
          // original value. When height changes, we need to disable flex.
          heightStyle = {
            height: this.frame.height - this.state.bottom,
            flex: 0,
          };
        }
        return (
          <View
            ref={viewRef}
            style={[style, heightStyle]}
            onLayout={this._onLayout}
            {...props}
          >
            {children}
          </View>
        );

      case 'position':
        const positionStyle = { bottom: this.state.bottom };
        const { contentContainerStyle } = this.props;

        return (
          <View
            ref={viewRef}
            style={style}
            onLayout={this._onLayout}
            {...props}
          >
            <View style={[contentContainerStyle, positionStyle]}>
              {children}
            </View>
          </View>
        );

      case 'padding':
        const paddingStyle = { paddingBottom: this.state.bottom };
        return (
          <View
            ref={viewRef}
            style={[style, paddingStyle]}
            onLayout={this._onLayout}
            {...props}
          >
            {children}
          </View>
        );

      default:
        return (
          <View
            ref={viewRef}
            onLayout={this._onLayout}
            style={style}
            {...props}
          >
            {children}
          </View>
        );
    }
  }

}

export default KeyboardAvoidingView;
