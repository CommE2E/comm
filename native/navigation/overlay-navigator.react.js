// @flow

import type {
  StackNavigationState,
  NavigatorPropsBase,
  ExtraNavigatorPropsBase,
  CreateNavigator,
  StackNavigationProp,
  ParamListBase,
  StackNavigationHelpers,
  ScreenListeners,
} from '@react-navigation/native';
import {
  useNavigationBuilder,
  createNavigatorFactory,
  NavigationHelpersContext,
} from '@react-navigation/native';
import { TransitionPresets } from '@react-navigation/stack';
import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { EasingNode } from 'react-native-reanimated';

import { values } from 'lib/utils/objects.js';

import { OverlayContext } from './overlay-context.js';
import OverlayRouter from './overlay-router.js';
import type { OverlayRouterExtraNavigationHelpers } from './overlay-router.js';
import { scrollBlockingModals, TabNavigatorRouteName } from './route-names.js';
import { isMessageTooltipKey } from '../chat/utils.js';

export type OverlayNavigationHelpers<ParamList: ParamListBase = ParamListBase> =
  {
    ...$Exact<StackNavigationHelpers<ParamList, {}>>,
    ...OverlayRouterExtraNavigationHelpers,
    ...
  };

export type OverlayNavigationProp<
  ParamList: ParamListBase = ParamListBase,
  RouteName: $Keys<ParamList> = $Keys<ParamList>,
> = {
  ...StackNavigationProp<ParamList, RouteName, {}, {}>,
  ...OverlayRouterExtraNavigationHelpers,
};

/* eslint-disable import/no-named-as-default-member */
const { Value, timing, cond, call, lessOrEq, block } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = $Exact<
  NavigatorPropsBase<
    {},
    ScreenListeners<StackNavigationState, {}>,
    OverlayNavigationHelpers<>,
  >,
>;
const OverlayNavigator = React.memo<Props>(
  ({ initialRouteName, children, screenOptions, screenListeners }: Props) => {
    const { state, descriptors, navigation } = useNavigationBuilder(
      OverlayRouter,
      {
        children,
        screenOptions,
        screenListeners,
        initialRouteName,
      },
    );
    const curIndex = state.index;

    const positionRefs = React.useRef({});
    const positions = positionRefs.current;

    const firstRenderRef = React.useRef(true);
    React.useEffect(() => {
      firstRenderRef.current = false;
    }, [firstRenderRef]);
    const firstRender = firstRenderRef.current;

    const { routes } = state;
    const scenes = React.useMemo(
      () =>
        routes.map((route, routeIndex) => {
          const descriptor = descriptors[route.key];
          invariant(
            descriptor,
            `OverlayNavigator could not find descriptor for ${route.key}`,
          );
          if (!positions[route.key]) {
            positions[route.key] = new Value(firstRender ? 1 : 0);
          }
          return {
            route,
            descriptor,
            context: {
              position: positions[route.key],
              isDismissing: curIndex < routeIndex,
            },
            ordering: {
              routeIndex,
            },
          };
        }),
      // We don't include descriptors here because they can change on every
      // render. We know that they should only substantially change if something
      // about the underlying route has changed
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [positions, routes, curIndex],
    );

    const prevScenesRef = React.useRef();
    const prevScenes = prevScenesRef.current;

    const visibleOverlayEntryForNewScene = scene => {
      const { route } = scene;
      if (route.name === TabNavigatorRouteName) {
        // We don't consider the TabNavigator at the bottom to be an overlay
        return undefined;
      }
      const presentedFrom = route.params
        ? route.params.presentedFrom
        : undefined;
      return {
        routeKey: route.key,
        routeName: route.name,
        position: positions[route.key],
        presentedFrom,
      };
    };

    const visibleOverlaysRef = React.useRef();
    if (!visibleOverlaysRef.current) {
      visibleOverlaysRef.current = scenes
        .map(visibleOverlayEntryForNewScene)
        .filter(Boolean);
    }
    let visibleOverlays = visibleOverlaysRef.current;

    // The scrollBlockingModalStatus state gets incorporated into the
    // OverlayContext, but it's global to the navigator rather than local to
    // each screen. Note that we also include the setter in OverlayContext. We
    // do this so that screens can freeze ScrollViews as quickly as possible to
    // avoid drags after onLongPress is triggered
    const getScrollBlockingModalStatus = data => {
      let status = 'closed';
      for (const scene of data) {
        if (!scrollBlockingModals.includes(scene.route.name)) {
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
    const [scrollBlockingModalStatus, setScrollBlockingModalStatus] =
      React.useState(() => getScrollBlockingModalStatus(scenes));
    const sceneDataForNewScene = scene => ({
      ...scene,
      context: {
        ...scene.context,
        visibleOverlays,
        scrollBlockingModalStatus,
        setScrollBlockingModalStatus,
      },
      ordering: {
        ...scene.ordering,
        creationTime: Date.now(),
      },
      listeners: [],
    });

    // We track two previous states of scrollBlockingModalStatus via refs. We
    // need two because we expose setScrollBlockingModalStatus to screens. We
    // track the previous sceneData-determined value separately so that we only
    // overwrite the screen-determined value with the sceneData-determined value
    // when the latter actually changes
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
      for (const scene of scenes) {
        const { key } = scene.route;
        newSceneData[key] = sceneDataForNewScene(scene);
      }
      return newSceneData;
    });
    const prevSceneDataRef = React.useRef(sceneData);
    const prevSceneData = prevSceneDataRef.current;

    // We need to initiate animations in useEffect blocks, but because we
    // setState within render we might have multiple renders before the
    // useEffect triggers. So we cache whether or not new animations should be
    // started in this ref
    const pendingAnimationsRef = React.useRef<{ [key: string]: number }>({});
    const queueAnimation = (key: string, toValue: number) => {
      pendingAnimationsRef.current = {
        ...pendingAnimationsRef.current,
        [key]: toValue,
      };
    };

    // This block keeps sceneData updated when our props change. It's the
    // hook equivalent of getDerivedStateFromProps
    // https://reactjs.org/docs/hooks-faq.html#how-do-i-implement-getderivedstatefromprops
    const updatedSceneData = { ...sceneData };
    let sceneDataChanged = false;
    if (prevScenes && scenes !== prevScenes) {
      const currentKeys = new Set();
      for (const scene of scenes) {
        const { key } = scene.route;
        currentKeys.add(key);

        let data = updatedSceneData[key];
        if (!data) {
          // A new route has been pushed
          const newVisibleOverlayEntry = visibleOverlayEntryForNewScene(scene);
          if (newVisibleOverlayEntry) {
            visibleOverlays = [...visibleOverlays, newVisibleOverlayEntry];
          }
          updatedSceneData[key] = sceneDataForNewScene(scene);
          sceneDataChanged = true;
          queueAnimation(key, 1);
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
        if (scene.context.isDismissing !== data.context.isDismissing) {
          data = { ...data, context: { ...data.context, ...scene.context } };
          dataChanged = true;
        }
        if (scene.ordering.routeIndex !== data.ordering.routeIndex) {
          data = { ...data, ordering: { ...data.ordering, ...scene.ordering } };
          dataChanged = true;
        }

        if (dataChanged) {
          // Something about an existing route has changed
          updatedSceneData[key] = data;
          sceneDataChanged = true;
        }
      }

      for (let i = 0; i < prevScenes.length; i++) {
        const scene = prevScenes[i];
        const { key } = scene.route;
        if (currentKeys.has(key)) {
          continue;
        }
        currentKeys.add(key);
        const data = updatedSceneData[key];
        invariant(data, `should have sceneData for dismissed key ${key}`);

        if (!visibleOverlayEntryForNewScene(scene)) {
          // This should only happen if TabNavigator gets dismissed
          // TabNavigator doesn't normally ever get dismissed, but hot reload
          // can cause that to happen. We don't need to animate TabNavigator
          // closed, and in fact we would crash if we tried. So we short-circuit
          // the logic below
          delete updatedSceneData[key];
          sceneDataChanged = true;
          continue;
        }

        // A route just got dismissed
        // We'll watch the animation to determine when to clear the screen
        const { position } = data.context;
        invariant(position, `should have position for dismissed key ${key}`);
        updatedSceneData[key] = {
          ...data,
          context: {
            ...data.context,
            isDismissing: true,
          },
          listeners: [
            cond(
              lessOrEq(position, 0),
              call([], () => {
                // This gets called when the scene is no longer visible and
                // handles cleaning up our data structures to remove it
                const curVisibleOverlays = visibleOverlaysRef.current;
                invariant(
                  curVisibleOverlays,
                  'visibleOverlaysRef should be set',
                );
                const newVisibleOverlays = curVisibleOverlays.filter(
                  overlay => overlay.routeKey !== key,
                );
                if (newVisibleOverlays.length === curVisibleOverlays.length) {
                  return;
                }
                visibleOverlaysRef.current = newVisibleOverlays;
                setSceneData(curSceneData => {
                  const newSceneData = {};
                  for (const sceneKey in curSceneData) {
                    if (sceneKey === key) {
                      continue;
                    }
                    newSceneData[sceneKey] = {
                      ...curSceneData[sceneKey],
                      context: {
                        ...curSceneData[sceneKey].context,
                        visibleOverlays: newVisibleOverlays,
                      },
                    };
                  }
                  return newSceneData;
                });
              }),
            ),
          ],
        };
        sceneDataChanged = true;
        queueAnimation(key, 0);
      }
    }

    if (visibleOverlays !== visibleOverlaysRef.current) {
      // This indicates we have pushed a new route. Let's make sure every
      // sceneData has the updated visibleOverlays
      for (const sceneKey in updatedSceneData) {
        updatedSceneData[sceneKey] = {
          ...updatedSceneData[sceneKey],
          context: {
            ...updatedSceneData[sceneKey].context,
            visibleOverlays,
          },
        };
      }
      visibleOverlaysRef.current = visibleOverlays;
      sceneDataChanged = true;
    }

    const pendingAnimations = pendingAnimationsRef.current;
    React.useEffect(() => {
      if (Object.keys(pendingAnimations).length === 0) {
        return;
      }
      for (const key in pendingAnimations) {
        const toValue = pendingAnimations[key];
        const position = positions[key];
        let duration = 150;
        if (isMessageTooltipKey(key)) {
          const navigationTransitionSpec =
            toValue === 0
              ? TransitionPresets.DefaultTransition.transitionSpec.close
              : TransitionPresets.DefaultTransition.transitionSpec.open;
          duration =
            (navigationTransitionSpec.animation === 'timing' &&
              navigationTransitionSpec.config.duration) ||
            400;
        }
        invariant(position, `should have position for animating key ${key}`);
        timing(position, {
          duration,
          easing: EasingNode.inOut(EasingNode.ease),
          toValue,
        }).start();
      }
      pendingAnimationsRef.current = {};
    }, [positions, pendingAnimations]);

    // If sceneData changes, we update scrollBlockingModalStatus based on it,
    // both in state and within the individual sceneData contexts.
    // If sceneData doesn't change,
    // it's still possible for scrollBlockingModalStatus to change via the
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
      prevScrollBlockingModalStatusFromSceneDataRef.current =
        statusFromSceneData;
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
      for (const key in updatedSceneData) {
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

    // Usually this would be done in an effect,
    // but calling setState from the body
    // of a hook causes the hook to rerender before triggering effects. To avoid
    // infinite loops we make sure to set our prev values after we finish
    // comparing them
    prevScenesRef.current = scenes;
    prevSceneDataRef.current = sceneDataChanged ? updatedSceneData : sceneData;
    prevScrollBlockingModalStatusRef.current = newScrollBlockingModalStatus
      ? newScrollBlockingModalStatus
      : scrollBlockingModalStatus;

    const sceneList = values(updatedSceneData).sort((a, b) => {
      const routeIndexDifference =
        a.ordering.routeIndex - b.ordering.routeIndex;
      if (routeIndexDifference) {
        return routeIndexDifference;
      }
      return a.ordering.creationTime - b.ordering.creationTime;
    });

    const screens = sceneList.map(scene => {
      const { route, descriptor, context, listeners } = scene;
      const { render } = descriptor;

      const pressable = !context.isDismissing && !route.params?.preventPresses;
      const pointerEvents = pressable ? 'auto' : 'none';

      // These listeners are used to clear routes after they finish dismissing
      const listenerCode =
        listeners.length > 0 ? <Animated.Code exec={block(listeners)} /> : null;
      return (
        <OverlayContext.Provider value={context} key={route.key}>
          <View style={styles.scene} pointerEvents={pointerEvents}>
            {render()}
          </View>
          {listenerCode}
        </OverlayContext.Provider>
      );
    });

    return (
      <NavigationHelpersContext.Provider value={navigation}>
        <View style={styles.container}>{screens}</View>
      </NavigationHelpersContext.Provider>
    );
  },
);
OverlayNavigator.displayName = 'OverlayNavigator';
const createOverlayNavigator: CreateNavigator<
  StackNavigationState,
  {},
  {},
  ExtraNavigatorPropsBase,
> = createNavigatorFactory<
  StackNavigationState,
  {},
  {},
  OverlayNavigationHelpers<>,
  ExtraNavigatorPropsBase,
>(OverlayNavigator);

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
