// @flow

import * as React from 'react';
import {
  type NavigationRouteConfigMap,
  type NavigationState,
  createNavigator,
} from 'react-navigation';
import {
  StackView,
  StackViewTransitionConfigs,
  type StackNavigatorConfig,
  type NavigationStackScreenOptions,
  type NavigationStackProp,
  type NavigationStackTransitionProps,
} from 'react-navigation-stack';
import { Keyboard } from 'react-native';

import {
  LoggedOutModalRouteName,
  VerificationModalRouteName,
  AppRouteName,
  ThreadPickerModalRouteName,
  AddUsersModalRouteName,
  CustomServerModalRouteName,
  ColorPickerModalRouteName,
  ComposeSubthreadModalRouteName,
  accountModals,
} from './route-names';
import LoggedOutModal from '../account/logged-out-modal.react';
import VerificationModal from '../account/verification-modal.react';
import AppNavigator from './app-navigator.react';
import ThreadPickerModal from '../calendar/thread-picker-modal.react';
import AddUsersModal from '../chat/settings/add-users-modal.react';
import CustomServerModal from '../more/custom-server-modal.react';
import ColorPickerModal from '../chat/settings/color-picker-modal.react';
import ComposeSubthreadModal from '../chat/settings/compose-subthread-modal.react';
import RootRouter from './root-router';

type NavigationProp = NavigationStackProp<NavigationState> & {
  logIn: () => void,
  logOut: () => void,
};
type StackViewProps = React.ElementConfig<typeof StackView> & {
  +navigation: NavigationProp,
};

function createRootNavigator(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: StackNavigatorConfig = {},
) {
  const {
    initialRouteName,
    initialRouteParams,
    paths,
    navigationOptions,
    defaultNavigationOptions,
    initialRouteKey,
    ...navigatorConfig
  } = stackConfig;
  const routerConfig = {
    initialRouteName,
    initialRouteParams,
    paths,
    navigationOptions,
    defaultNavigationOptions,
    initialRouteKey,
  };
  return createNavigator<
    NavigationStackScreenOptions,
    NavigationState,
    StackNavigatorConfig,
    NavigationProp,
    StackViewProps,
  >(StackView, RootRouter(routeConfigMap, routerConfig), navigatorConfig);
}

const RootNavigator = createRootNavigator(
  {
    [LoggedOutModalRouteName]: LoggedOutModal,
    [VerificationModalRouteName]: VerificationModal,
    [AppRouteName]: AppNavigator,
    [ThreadPickerModalRouteName]: ThreadPickerModal,
    [AddUsersModalRouteName]: AddUsersModal,
    [CustomServerModalRouteName]: CustomServerModal,
    [ColorPickerModalRouteName]: ColorPickerModal,
    [ComposeSubthreadModalRouteName]: ComposeSubthreadModal,
  },
  {
    headerMode: 'none',
    mode: 'modal',
    transparentCard: true,
    disableKeyboardHandling: true,
    onTransitionStart: (
      transitionProps: NavigationStackTransitionProps,
      prevTransitionProps: ?NavigationStackTransitionProps,
    ) => {
      if (!prevTransitionProps) {
        return;
      }
      const { scene } = transitionProps;
      const { route } = scene;
      const { scene: prevScene } = prevTransitionProps;
      const { route: prevRoute } = prevScene;
      if (route.key === prevRoute.key) {
        return;
      }
      if (
        route.routeName !== AppRouteName ||
        prevRoute.routeName !== ThreadPickerModalRouteName
      ) {
        Keyboard.dismiss();
      }
    },
    transitionConfig: (
      transitionProps: NavigationStackTransitionProps,
      prevTransitionProps: ?NavigationStackTransitionProps,
      isModal: boolean,
    ) => {
      const defaultConfig = StackViewTransitionConfigs.defaultTransitionConfig(
        transitionProps,
        prevTransitionProps,
        isModal,
      );
      return {
        ...defaultConfig,
        screenInterpolator: sceneProps => {
          const {
            opacity: defaultOpacity,
            ...defaultInterpolation
          } = defaultConfig.screenInterpolator(sceneProps);
          const { position, scene } = sceneProps;
          const { index, route } = scene;
          if (
            accountModals.includes(route.routeName) ||
            route.routeName === AppRouteName
          ) {
            return defaultInterpolation;
          }
          const opacity = position.interpolate({
            inputRange: [index - 1, index],
            outputRange: ([0, 1]: number[]),
          });
          return { ...defaultInterpolation, opacity };
        },
      };
    },
  },
);

export default RootNavigator;
