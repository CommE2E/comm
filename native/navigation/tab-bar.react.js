// @flow

import { BottomTabBar } from '@react-navigation/bottom-tabs';
import * as React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Animated, { EasingNode } from 'react-native-reanimated';
import { useSafeArea } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { KeyboardContext } from '../keyboard/keyboard-state.js';
import { updateDimensionsActiveType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import type { LayoutEvent } from '../types/react-native.js';

/* eslint-disable import/no-named-as-default-member */
const { Value, timing, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

const tabBarAnimationDuration = 200;

type Props = React.ElementConfig<typeof BottomTabBar>;
function TabBar(props: Props) {
  const tabBarVisibleRef = React.useRef();
  if (!tabBarVisibleRef.current) {
    tabBarVisibleRef.current = new Value(1);
  }
  const tabBarVisible = tabBarVisibleRef.current;

  const keyboardState = React.useContext(KeyboardContext);
  const shouldHideTabBar = keyboardState?.mediaGalleryOpen;

  const prevKeyboardStateRef = React.useRef();
  React.useEffect(() => {
    prevKeyboardStateRef.current = keyboardState;
  }, [keyboardState]);
  const prevKeyboardState = prevKeyboardStateRef.current;

  const setTabBar = React.useCallback(
    toValue => {
      const keyboardIsShowing = keyboardState && keyboardState.keyboardShowing;
      const keyboardWasShowing =
        prevKeyboardState && prevKeyboardState.keyboardShowing;
      if (keyboardIsShowing === keyboardWasShowing) {
        tabBarVisible.setValue(toValue);
        return;
      }
      timing(tabBarVisible, {
        toValue,
        duration: tabBarAnimationDuration,
        easing: EasingNode.inOut(EasingNode.ease),
      }).start();
    },
    [keyboardState, prevKeyboardState, tabBarVisible],
  );

  const prevShouldHideTabBarRef = React.useRef(false);
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
    height => {
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
    (e: LayoutEvent) => {
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

  const containerHeight = React.useMemo(
    () =>
      interpolateNode(tabBarVisible, {
        inputRange: [0, 1],
        outputRange: [0, tabBarHeight],
      }),
    [tabBarVisible, tabBarHeight],
  );
  const containerStyle = React.useMemo(
    () => ({
      height: tabBarHeight ? containerHeight : undefined,
      ...styles.container,
    }),
    [tabBarHeight, containerHeight],
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

// This is a render prop, not a component
// eslint-disable-next-line react/display-name
const tabBar = (props: Props): React.Node => <TabBar {...props} />;

export { tabBarAnimationDuration, tabBar };
