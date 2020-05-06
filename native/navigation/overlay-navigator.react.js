// @flow

import type {
  NavigationStackProp,
  NavigationState,
  NavigationDescriptor,
  NavigationRouteConfigMap,
  NavigationStackTransitionProps,
  NavigationStackScene,
  StackNavigatorConfig,
  NavigationTransitionSpec,
} from 'react-navigation-stack';
import type { NavigationStackScreenOptions } from 'react-navigation';

import * as React from 'react';
import {
  View,
  StyleSheet,
  Animated as BaseAnimated,
  Easing as BaseEasing,
} from 'react-native';
import { createNavigator, StackActions } from 'react-navigation';
import { Transitioner } from 'react-navigation-stack';
import Animated, { Easing } from 'react-native-reanimated';

import OverlayRouter from './overlay-router';
import { OverlayContext } from './overlay-context';

function createOverlayNavigator(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig: StackNavigatorConfig = {},
) {
  const {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  } = stackConfig;
  const stackRouterConfig = {
    initialRouteName,
    initialRouteParams,
    paths,
    defaultNavigationOptions,
    initialRouteKey,
  };
  return createNavigator<
    NavigationStackScreenOptions,
    NavigationState,
    StackNavigatorConfig,
    NavigationStackProp<NavigationState>,
    OverlayNavigatorProps,
  >(
    OverlayNavigator,
    OverlayRouter(routeConfigMap, stackRouterConfig),
    stackConfig,
  );
}

function configureTransition() {
  const spec: NavigationTransitionSpec = ({
    duration: 250,
    easing: BaseEasing.inOut(BaseEasing.ease),
    timing: BaseAnimated.timing,
    useNativeDriver: true,
  }: any);
  return spec;
}

type OverlayNavigatorProps = {
  navigation: NavigationStackProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
};
type Props = $ReadOnly<OverlayNavigatorProps>;
function OverlayNavigator(props: Props) {
  const { navigation, descriptors } = props;
  const curIndex = navigation.state.index;

  const positionRef = React.useRef();
  if (!positionRef.current) {
    // eslint-disable-next-line import/no-named-as-default-member
    positionRef.current = new Animated.Value(curIndex);
  }
  const position = positionRef.current;

  const onTransitionStart = React.useCallback(
    (transitionProps: NavigationStackTransitionProps) => {
      const { index } = transitionProps.navigation.state;
      // eslint-disable-next-line import/no-named-as-default-member
      Animated.timing(position, {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        toValue: index,
      }).start();
    },
    [position],
  );

  const onTransitionEnd = React.useCallback(
    (transitionProps: NavigationStackTransitionProps) => {
      if (!transitionProps.navigation.state.isTransitioning) {
        return;
      }
      const transitionDestKey = transitionProps.scene.route.key;
      const isCurrentKey =
        navigation.state.routes[navigation.state.index].key ===
        transitionDestKey;
      if (!isCurrentKey) {
        return;
      }
      navigation.dispatch(
        StackActions.completeTransition({ toChildKey: transitionDestKey }),
      );
    },
    [navigation],
  );

  const renderScene = React.useCallback(
    (
      scene: NavigationStackScene,
      transitionProps: NavigationStackTransitionProps,
      pressable: boolean,
    ) => {
      if (!scene.descriptor) {
        return null;
      }
      const { navigation: childNavigation, getComponent } = scene.descriptor;
      const SceneComponent = getComponent();
      const pointerEvents = pressable ? 'auto' : 'none';
      const overlayContext = {
        position,
        isDismissing: transitionProps.index < scene.index,
        routeIndex: scene.index,
      };
      return (
        <OverlayContext.Provider value={overlayContext} key={scene.key}>
          <View style={styles.scene} pointerEvents={pointerEvents}>
            <SceneComponent navigation={childNavigation} />
          </View>
        </OverlayContext.Provider>
      );
    },
    [position],
  );

  const renderScenes = React.useCallback(
    (transitionProps: NavigationStackTransitionProps) => {
      const views = [];
      let pressableSceneAssigned = false,
        activeSceneFound = false;
      for (let i = transitionProps.scenes.length - 1; i >= 0; i--) {
        const scene = transitionProps.scenes[i];
        const {
          isActive,
          route: { params },
        } = scene;

        if (isActive) {
          activeSceneFound = true;
        }

        let pressable = false;
        if (
          !pressableSceneAssigned &&
          activeSceneFound &&
          (!params || !params.preventPresses)
        ) {
          pressable = true;
          pressableSceneAssigned = true;
        }

        views.unshift(renderScene(scene, transitionProps, pressable));
      }
      return views;
    },
    [renderScene],
  );

  return (
    <Transitioner
      render={renderScenes}
      configureTransition={configureTransition}
      navigation={navigation}
      descriptors={descriptors}
      onTransitionStart={onTransitionStart}
      onTransitionEnd={onTransitionEnd}
    />
  );
}

const styles = StyleSheet.create({
  scene: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export { createOverlayNavigator };
