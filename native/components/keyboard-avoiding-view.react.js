// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  View,
  Keyboard,
  Platform,
  LayoutAnimation,
  StyleSheet,
} from 'react-native';

import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import type { ScreenRect } from '../keyboard/keyboard.js';
import type {
  Layout,
  LayoutEvent,
  EventSubscription,
  KeyboardEvent,
} from '../types/react-native.js';
import type { ViewStyle } from '../types/styles.js';

type ViewProps = React.ElementConfig<typeof View>;
type BaseProps = {
  ...ViewProps,
  +behavior: 'height' | 'position' | 'padding',
  +contentContainerStyle?: ?ViewStyle,
};
const KeyboardAvoidingView: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function KeyboardAvoidingView(props: BaseProps) {
    const keyboardState = React.useContext(KeyboardContext);
    return (
      <InnerKeyboardAvoidingView {...props} keyboardState={keyboardState} />
    );
  });

type Props = {
  ...BaseProps,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
};
type State = {
  +bottom: number,
};
class InnerKeyboardAvoidingView extends React.PureComponent<Props, State> {
  state: State = {
    bottom: 0,
  };
  subscriptions: EventSubscription[] = [];
  viewFrame: ?Layout;
  keyboardFrame: ?ScreenRect;
  defaultViewFrameHeight = 0;
  waitingForLayout: Array<() => mixed> = [];

  componentDidMount() {
    if (Platform.OS === 'ios') {
      this.subscriptions.push(
        Keyboard.addListener('keyboardWillChangeFrame', this.onKeyboardChange),
      );
    } else {
      this.subscriptions.push(
        Keyboard.addListener('keyboardDidHide', this.onKeyboardChange),
        Keyboard.addListener('keyboardDidShow', this.onKeyboardChange),
      );
    }
  }

  componentWillUnmount() {
    for (const subscription of this.subscriptions) {
      subscription.remove();
    }
  }

  onKeyboardChange = (event: ?KeyboardEvent) => {
    if (!event) {
      this.keyboardFrame = null;
      this.setState({ bottom: 0 });
      return;
    }

    if (!this.viewFrame) {
      this.waitingForLayout.push(() => this.onKeyboardChange(event));
      return;
    }

    const { duration, easing, endCoordinates } = event;
    this.keyboardFrame = endCoordinates;

    const { keyboardState } = this.props;
    const mediaGalleryOpen = keyboardState && keyboardState.mediaGalleryOpen;
    if (
      Platform.OS === 'android' &&
      mediaGalleryOpen &&
      this.keyboardFrame.height > 0 &&
      this.viewFrame
    ) {
      this.viewFrame = {
        ...this.viewFrame,
        height: this.defaultViewFrameHeight,
      };
    }

    const height = this.relativeKeyboardHeight;
    if (height === this.state.bottom) {
      return;
    }
    this.setState({ bottom: height });

    if (duration && easing) {
      LayoutAnimation.configureNext({
        duration: duration > 10 ? duration : 10,
        update: {
          duration: duration > 10 ? duration : 10,
          type: LayoutAnimation.Types[easing] || 'keyboard',
        },
      });
    }
  };

  get relativeKeyboardHeight() {
    const { viewFrame, keyboardFrame } = this;
    if (!viewFrame || !keyboardFrame) {
      return 0;
    }
    return Math.max(viewFrame.y + viewFrame.height - keyboardFrame.screenY, 0);
  }

  onLayout = (event: LayoutEvent) => {
    this.viewFrame = event.nativeEvent.layout;

    const { keyboardState } = this.props;
    const keyboardShowing = keyboardState && keyboardState.keyboardShowing;
    if (!keyboardShowing) {
      this.defaultViewFrameHeight = this.viewFrame.height;
    }

    for (const callback of this.waitingForLayout) {
      callback();
    }
    this.waitingForLayout = [];
  };

  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
  render() {
    const {
      behavior,
      children,
      contentContainerStyle,
      style,
      keyboardState,
      ...props
    } = this.props;
    const { bottom } = this.state;
    if (behavior === 'height') {
      let heightStyle;
      if (this.viewFrame && bottom > 0) {
        heightStyle = {
          height: this.defaultViewFrameHeight - bottom,
          flex: 0,
        };
      }
      const composedStyle = StyleSheet.compose(style, heightStyle);
      return (
        <View style={composedStyle} onLayout={this.onLayout} {...props}>
          {children}
        </View>
      );
    } else if (behavior === 'position') {
      const composedStyle = StyleSheet.compose(contentContainerStyle, {
        bottom,
      });
      const { pointerEvents } = props;
      return (
        <View style={style} onLayout={this.onLayout} {...props}>
          <View style={composedStyle} pointerEvents={pointerEvents}>
            {children}
          </View>
        </View>
      );
    } else if (behavior === 'padding') {
      const composedStyle = StyleSheet.compose(style, {
        paddingBottom: bottom,
      });
      return (
        <View style={composedStyle} onLayout={this.onLayout} {...props}>
          {children}
        </View>
      );
    }
    invariant(false, `invalid KeyboardAvoidingView behavior ${behavior}`);
  }
}

export default KeyboardAvoidingView;
