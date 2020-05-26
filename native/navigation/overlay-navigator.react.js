// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';
import invariant from 'invariant';
import {
  useNavigationBuilder,
  createNavigatorFactory,
  NavigationHelpersContext,
} from '@react-navigation/native';

import { values } from 'lib/utils/objects';

import OverlayRouter from './overlay-router';
import { OverlayContext } from './overlay-context';
import { scrollBlockingChatModals } from './route-names';

/* eslint-disable import/no-named-as-default-member */
const { Value, timing, cond, call, lessOrEq, block } = Animated;
/* eslint-enable import/no-named-as-default-member */

const OverlayNavigator = React.memo<any>(({
  initialRouteName,
  children,
  screenOptions,
  ...rest
}) => {
  const { state, descriptors, navigation } = useNavigationBuilder(OverlayRouter, {
    children,
    screenOptions,
    initialRouteName,
  });
  const curIndex = state.index;

  const positionRef = React.useRef();
  if (!positionRef.current) {
    positionRef.current = new Value(curIndex);
  }
  const position = positionRef.current;

  const { routes } = state;
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
    [position, routes, curIndex],
  );

  const prevScenesRef = React.useRef();
  const prevScenes = prevScenesRef.current;

  // The scrollBlockingModalStatus state gets incorporated into the
  // OverlayContext, but it's global to the navigator rather than local to each
  // screen. Note that we also include the setter in OverlayContext. We do this
  // so that screens can freeze ScrollViews as quickly as possible to avoid
  // drags after onLongPress is triggered
  const getScrollBlockingModalStatus = data => {
    let status = 'closed';
    for (let scene of data) {
      if (!scrollBlockingChatModals.includes(scene.route.name)) {
        continue;
      }
      if (!scene.context.isDismissing) {
        status = 'open';
        break;
      }
      status = 'closing';
    }
    return status;
  };
  const [
    scrollBlockingModalStatus,
    setScrollBlockingModalStatus,
  ] = React.useState(() => getScrollBlockingModalStatus(scenes));
  const sceneDataForNewScene = scene => ({
    ...scene,
    context: {
      ...scene.context,
      scrollBlockingModalStatus,
      setScrollBlockingModalStatus,
    },
    listeners: [],
  });

  // We track two previous states of scrollBlockingModalStatus via refs. We need
  // two because we expose setScrollBlockingModalStatus to screens. We track the
  // previous sceneData-determined value separately so that we only overwrite
  // the screen-determined value with the sceneData-determined value when the
  // latter actually changes
  const prevScrollBlockingModalStatusRef = React.useRef(
    scrollBlockingModalStatus,
  );
  const prevScrollBlockingModalStatus =
    prevScrollBlockingModalStatusRef.current;
  const prevScrollBlockingModalStatusFromSceneDataRef = React.useRef(
    scrollBlockingModalStatus,
  );
  const prevScrollBlockingModalStatusFromSceneData =
    prevScrollBlockingModalStatusFromSceneDataRef.current;

  // We need state to continue rendering screens while they are dismissing
  const [sceneData, setSceneData] = React.useState(() => {
    const newSceneData = {};
    for (let scene of scenes) {
      const { key } = scene.route;
      newSceneData[key] = sceneDataForNewScene(scene);
    }
    return newSceneData;
  });
  const prevSceneDataRef = React.useRef(sceneData);
  const prevSceneData = prevSceneDataRef.current;

  // We need to initiate animations in useEffect blocks, but because we setState
  // within render we might have multiple renders before the useEffect triggers.
  // So we cache whether or not a new animation should be started in this ref
  const pendingAnimationRef = React.useRef(false);

  // This block keeps sceneData updated when our props change. It's the
  // hook equivalent of getDerivedStateFromProps
  // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
  const updatedSceneData = { ...sceneData };
  let sceneDataChanged = false;
  if (prevScenes && scenes !== prevScenes) {
    let sceneAdded = false;
    const currentKeys = new Set();
    for (let scene of scenes) {
      const { key } = scene.route;
      currentKeys.add(key);

      let data = updatedSceneData[key];
      if (!data) {
        // A new route has been pushed
        updatedSceneData[key] = sceneDataForNewScene(scene);
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
        // We don't set dataChanged here because descriptors get recomputed on
        // every render, which means we could get an infinite loop. However,
        // we want to update the descriptor whenever anything else changes, so
        // that if and when our scene is dismissed, the sceneData has the most
        // recent descriptor
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
      // We only consider a fresh dismissal if no scene has been added because
      // pushing a new route wipes out any dismissals
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
          context: {
            ...data.context,
            isDismissing: true,
          },
          listeners: [
            cond(
              lessOrEq(position, i - 1),
              call([], () =>
                setSceneData(curSceneData => {
                  const newSceneData = { ...curSceneData };
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
      pendingAnimationRef.current = true;
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
  }

  const startAnimation = pendingAnimationRef.current;
  React.useEffect(() => {
    if (!startAnimation) {
      return;
    }
    pendingAnimationRef.current = false;
    timing(position, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      toValue: curIndex,
    }).start();
  }, [position, startAnimation, curIndex]);

  // If sceneData changes, we update scrollBlockingModalStatus based on it, both
  // in state and within the individual sceneData contexts. If sceneData doesn't
  // change, it's still possible for scrollBlockingModalStatus to change via the
  // setScrollBlockingModalStatus callback we expose via context
  let newScrollBlockingModalStatus;
  if (sceneDataChanged || sceneData !== prevSceneData) {
    const statusFromSceneData = getScrollBlockingModalStatus(
      values(updatedSceneData),
    );
    if (
      statusFromSceneData !== scrollBlockingModalStatus &&
      statusFromSceneData !== prevScrollBlockingModalStatusFromSceneData
    ) {
      newScrollBlockingModalStatus = statusFromSceneData;
    }
    prevScrollBlockingModalStatusFromSceneDataRef.current = statusFromSceneData;
  }
  if (
    !newScrollBlockingModalStatus &&
    scrollBlockingModalStatus !== prevScrollBlockingModalStatus
  ) {
    newScrollBlockingModalStatus = scrollBlockingModalStatus;
  }
  if (newScrollBlockingModalStatus) {
    if (newScrollBlockingModalStatus !== scrollBlockingModalStatus) {
      setScrollBlockingModalStatus(newScrollBlockingModalStatus);
    }
    for (let key in updatedSceneData) {
      const data = updatedSceneData[key];
      updatedSceneData[key] = {
        ...data,
        context: {
          ...data.context,
          scrollBlockingModalStatus: newScrollBlockingModalStatus,
        },
      };
    }
    sceneDataChanged = true;
  }

  if (sceneDataChanged) {
    setSceneData(updatedSceneData);
  }

  // Usually this would be done in an effect, but calling setState from the body
  // of a hook causes the hook to rerender before triggering effects. To avoid
  // infinite loops we make sure to set our prev values after we finish
  // comparing them
  prevScenesRef.current = scenes;
  prevSceneDataRef.current = sceneDataChanged ? updatedSceneData : sceneData;
  prevScrollBlockingModalStatusRef.current = newScrollBlockingModalStatus
    ? newScrollBlockingModalStatus
    : scrollBlockingModalStatus;

  const sceneList = values(updatedSceneData).sort(
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

    const { render } = descriptor;
    const pointerEvents = pressable ? 'auto' : 'none';

    // These listeners are used to clear routes after they finish dismissing
    const listenerCode =
      listeners.length > 0 ? <Animated.Code exec={block(listeners)} /> : null;
    screens.unshift(
      <OverlayContext.Provider value={context} key={route.key}>
        <View style={styles.scene} pointerEvents={pointerEvents}>
          {render()}
        </View>
        {listenerCode}
      </OverlayContext.Provider>,
    );
  }

  return (
    <NavigationHelpersContext.Provider value={navigation}>
      <View style={styles.container}>
        {screens}
      </View>
    </NavigationHelpersContext.Provider>
  );
});
OverlayNavigator.displayName = 'OverlayNavigator';
const createOverlayNavigator = createNavigatorFactory(OverlayNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scene: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export { createOverlayNavigator };
