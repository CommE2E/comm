// @flow

import type { Layout, LayoutEvent } from '../types/react-native';
import type { ScreenRect, KeyboardEvent } from '../keyboard/keyboard';
import type { ViewStyle } from '../types/styles';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state';

import * as React from 'react';
import {
  View,
  Keyboard,
  Platform,
  LayoutAnimation,
  StyleSheet,
} from 'react-native';
import invariant from 'invariant';

import { androidKeyboardResizesFrame } from '../keyboard/keyboard';

type ViewProps = React.ElementConfig<typeof View>;
type BaseProps = {|
  ...ViewProps,
  +behavior: 'height' | 'position' | 'padding',
  +contentContainerStyle?: ?ViewStyle,
|};
export default React.memo<BaseProps>(function KeyboardAvoidingView(
  props: BaseProps,
) {
  const keyboardState = React.useContext(KeyboardContext);
  if (!androidKeyboardResizesFrame) {
    return (
      <InnerKeyboardAvoidingView {...props} keyboardState={keyboardState} />
    );
  }

  const { behavior, contentContainerStyle, ...viewProps } = props;
  if (behavior !== 'position') {
    return <View {...viewProps} />;
  }

  const { children, ...restViewProps } = viewProps;
  return (
    <View {...restViewProps}>
      <View style={contentContainerStyle}>{children}</View>
    </View>
  );
});

type Props = {|
  ...BaseProps,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
|};
type State = {|
  +bottom: number,
|};
type Subscription = { +remove: () => void, ... };
class InnerKeyboardAvoidingView extends React.PureComponent<Props, State> {
  state = {
    bottom: 0,
  };
  subscriptions: Subscription[] = [];
  viewFrame: ?Layout;
  keyboardFrame: ?ScreenRect;
  defaultViewFrameHeight = 0;

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

    const { duration, easing, endCoordinates } = event;
    this.keyboardFrame = endCoordinates;

    const { keyboardState } = this.props;
    const mediaGalleryOpen = keyboardState && keyboardState.mediaGalleryOpen;
    if (
      Platform.OS === 'android' &&
      !androidKeyboardResizesFrame &&
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
  };

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
