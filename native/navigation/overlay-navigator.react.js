// @flow

import type {
  NavigationStackProp,
  NavigationState,
  NavigationDescriptor,
  NavigationRouteConfigMap,
  StackNavigatorConfig,
} from 'react-navigation-stack';
import type { NavigationStackScreenOptions } from 'react-navigation';

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNavigator } from 'react-navigation';
import Animated, { Easing } from 'react-native-reanimated';
import invariant from 'invariant';

import OverlayRouter from './overlay-router';
import { OverlayContext } from './overlay-context';

/* eslint-disable import/no-named-as-default-member */
const { Value, timing, cond, call, lessOrEq, block } = Animated;
/* eslint-enable import/no-named-as-default-member */

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

type OverlayNavigatorProps = {
  navigation: NavigationStackProp<NavigationState>,
  descriptors: { [key: string]: NavigationDescriptor },
  navigationConfig: StackNavigatorConfig,
};
type Props = $ReadOnly<OverlayNavigatorProps>;
const OverlayNavigator = React.memo<Props>((props: Props) => {
  const { navigation, descriptors } = props;
  const curIndex = navigation.state.index;

  const positionRef = React.useRef();
  if (!positionRef.current) {
    positionRef.current = new Value(curIndex);
  }
  const position = positionRef.current;

  const { routes } = navigation.state;
  const scenes = React.useMemo(
    () =>
      routes.map((route, routeIndex) => {
        const descriptor = descriptors[route.key];
        invariant(
          descriptor,
          `OverlayNavigator could not find descriptor for ${route.key}`,
        );
        return {
          route,
          descriptor,
          context: {
            position,
            isDismissing: curIndex < routeIndex,
            routeIndex,
          },
        };
      }),
    [position, routes, descriptors, curIndex],
  );

  const prevScenesRef = React.useRef(null);
  const prevScenes = prevScenesRef.current;

  // We need state to continue rendering screens while they are dismissing
  const [sceneData, setSceneData] = React.useState(() => {
    const newSceneData = {};
    for (let scene of scenes) {
      const { key } = scene.route;
      newSceneData[key] = { ...scene, listeners: [] };
    }
    return newSceneData;
  });

  // This block keeps sceneData updated when our props change. It's the
  // hook equivalent of getDerivedStateFromProps
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  const updatedSceneData = { ...sceneData };
  if (prevScenes && scenes !== prevScenes) {
    let sceneDataChanged = false;

    let sceneAdded = false;
    const currentKeys = new Set();
    for (let scene of scenes) {
      const { key } = scene.route;
      currentKeys.add(key);

      let data = updatedSceneData[key];
      if (!data) {
        // A new route has been pushed
        updatedSceneData[key] = { ...scene, listeners: [] };
        sceneDataChanged = true;
        sceneAdded = true;
        continue;
      }

      let dataChanged = false;
      if (scene.route !== data.route) {
        data = { ...data, route: scene.route };
        dataChanged = true;
      }
      if (scene.descriptor !== data.descriptor) {
        data = { ...data, descriptor: scene.descriptor };
        dataChanged = true;
      }
      if (
        scene.context.position !== data.context.position ||
        scene.context.isDismissing !== data.context.isDismissing ||
        scene.context.routeIndex !== data.context.routeIndex
      ) {
        data = { ...data, context: scene.context };
        dataChanged = true;
      }

      if (dataChanged) {
        // Something about an existing route has changed
        updatedSceneData[key] = data;
        sceneDataChanged = true;
      }
    }

    let dismissingSceneData;
    if (!sceneAdded) {
      // Pushing a new route wipes out any dismissals
      for (let i = 0; i < prevScenes.length; i++) {
        const scene = prevScenes[i];
        const { key } = scene.route;
        if (currentKeys.has(key)) {
          continue;
        }
        currentKeys.add(key);
        const data = updatedSceneData[key];
        invariant(data, `should have sceneData for dismissed key ${key}`);
        // A route just got dismissed
        // We'll watch the animation to determine when to clear the screen
        dismissingSceneData = {
          ...data,
          listeners: [
            cond(
              lessOrEq(position, i - 1),
              call([], () =>
                setSceneData(prevSceneData => {
                  const newSceneData = { ...prevSceneData };
                  delete newSceneData[key];
                  return newSceneData;
                }),
              ),
            ),
          ],
        };
        updatedSceneData[key] = dismissingSceneData;
        sceneDataChanged = true;
        break;
      }
    }

    if (sceneAdded || dismissingSceneData) {
      // We start an animation whenever a scene is added or dismissed
      timing(position, {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        toValue: curIndex,
      }).start();
    }

    // We want to keep at most one dismissing scene in the sceneData at a time
    for (let key in updatedSceneData) {
      if (currentKeys.has(key)) {
        continue;
      }
      const data = updatedSceneData[key];
      if (!sceneAdded && !dismissingSceneData && data.listeners.length > 0) {
        dismissingSceneData = data;
      } else {
        // A route has just gotten cleared. This can occur if multiple routes
        // are popped off at once, or if the user pops two routes in rapid
        // succession
        delete updatedSceneData[key];
        sceneDataChanged = true;
      }
    }

    if (sceneDataChanged) {
      setSceneData(updatedSceneData);
    }
  }

  // Usually this would be done in an effect, but calling setState from the body
  // of a hook causes the hook to rerender before triggering effects. To avoid
  // infinite loops we make sure to set prevScenes after we finish comparing it
  prevScenesRef.current = scenes;

  // Flow won't let us use Object.values...
  const unsortedSceneList = [];
  for (let key in updatedSceneData) {
    unsortedSceneList.push(updatedSceneData[key]);
  }
  const sceneList = unsortedSceneList.sort(
    (a, b) => a.context.routeIndex - b.context.routeIndex,
  );

  const screens = [];
  let pressableSceneAssigned = false,
    activeSceneFound = false;
  for (let i = sceneList.length - 1; i >= 0; i--) {
    const scene = sceneList[i];
    const { route, descriptor, context, listeners } = scene;

    if (!context.isDismissing) {
      activeSceneFound = true;
    }

    let pressable = false;
    if (
      !pressableSceneAssigned &&
      activeSceneFound &&
      (!route.params || !route.params.preventPresses)
    ) {
      // Only one route can be pressable at a time. We pick the first route that
      // is not dismissing and doesn't have preventPresses set in its params
      pressable = true;
      pressableSceneAssigned = true;
    }

    const { navigation: childNavigation, getComponent } = descriptor;
    const SceneComponent = getComponent();
    const pointerEvents = pressable ? 'auto' : 'none';

    // These listeners are used to clear routes after they finish dismissing
    const listenerCode =
      listeners.length > 0 ? <Animated.Code exec={block(listeners)} /> : null;
    screens.unshift(
      <OverlayContext.Provider value={context} key={route.key}>
        <View style={styles.scene} pointerEvents={pointerEvents}>
          <SceneComponent navigation={childNavigation} />
        </View>
        {listenerCode}
      </OverlayContext.Provider>,
    );
  }

  return screens;
});
OverlayNavigator.displayName = 'OverlayNavigator';

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
