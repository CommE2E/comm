// @flow

import { BottomTabBar } from '@react-navigation/bottom-tabs';
import * as React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeArea } from 'react-native-safe-area-context';

import { useDispatch } from 'lib/utils/redux-utils.js';

import {
  KeyboardContext,
  type KeyboardState,
} from '../keyboard/keyboard-state.js';
import { updateDimensionsActiveType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import type { LayoutChangeEvent } from '../types/react-native.js';

const tabBarAnimationDuration = 200;

type Props = React.ElementConfig<typeof BottomTabBar>;
function TabBar(props: Props) {
  const tabBarVisible = useSharedValue(1);

  const keyboardState = React.useContext(KeyboardContext);
  const shouldHideTabBar = keyboardState?.mediaGalleryOpen;

  const prevKeyboardStateRef = React.useRef<?KeyboardState>();
  React.useEffect(() => {
    prevKeyboardStateRef.current = keyboardState;
  }, [keyboardState]);
  const prevKeyboardState = prevKeyboardStateRef.current;

  const setTabBar = React.useCallback(
    (toValue: number) => {
      const keyboardIsShowing = keyboardState && keyboardState.keyboardShowing;
      const keyboardWasShowing =
        prevKeyboardState && prevKeyboardState.keyboardShowing;
      if (keyboardIsShowing === keyboardWasShowing) {
        tabBarVisible.value = toValue;
        return;
      }
      tabBarVisible.value = withTiming(toValue, {
        duration: tabBarAnimationDuration,
        easing: Easing.inOut(Easing.ease),
      });
    },
    [keyboardState, prevKeyboardState, tabBarVisible],
  );

  const prevShouldHideTabBarRef = React.useRef<?boolean>(false);
  React.useEffect(() => {
    const prevShouldHideTabBar = prevShouldHideTabBarRef.current;
    if (shouldHideTabBar && !prevShouldHideTabBar) {
      setTabBar(0);
    } else if (!shouldHideTabBar && prevShouldHideTabBar) {
      setTabBar(1);
    }
    prevShouldHideTabBarRef.current = shouldHideTabBar;
  }, [shouldHideTabBar, setTabBar]);

  const reduxTabBarHeight = useSelector(state => state.dimensions.tabBarHeight);
  const dispatch = useDispatch();
  const setReduxTabBarHeight = React.useCallback(
    (height: number) => {
      if (height === reduxTabBarHeight) {
        return;
      }
      dispatch({
        type: updateDimensionsActiveType,
        payload: { tabBarHeight: height },
      });
    },
    [reduxTabBarHeight, dispatch],
  );

  const [tabBarHeight, setTabBarHeight] = React.useState(0);
  const insets = useSafeArea();
  const handleLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      const rawHeight = Math.round(e.nativeEvent.layout.height);
      if (rawHeight > 100 || rawHeight <= 0) {
        return;
      }
      if (Platform.OS === 'android') {
        setTabBarHeight(rawHeight);
      }
      const height = rawHeight - insets.bottom;
      if (height > 0) {
        setReduxTabBarHeight(height);
      }
    },
    [setTabBarHeight, setReduxTabBarHeight, insets],
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (!tabBarHeight) {
      return { height: undefined };
    }
    const height = interpolate(tabBarVisible.value, [0, 1], [0, tabBarHeight]);
    return { height };
  });

  const containerStyle = React.useMemo(
    () => [animatedStyle, styles.container],
    [animatedStyle],
  );

  if (Platform.OS !== 'android') {
    return (
      <View onLayout={handleLayout} style={styles.container}>
        <BottomTabBar {...props} />
      </View>
    );
  }

  return (
    <Animated.View style={containerStyle}>
      <View onLayout={handleLayout} style={styles.container}>
        <BottomTabBar {...props} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    right: 0,
  },
});

const tabBar = (props: Props): React.Node => <TabBar {...props} />;

export { tabBarAnimationDuration, tabBar };
