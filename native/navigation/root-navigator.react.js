// @flow

import * as React from 'react';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackView, TransitionPresets } from '@react-navigation/stack';
import NavigationBuilderContext from '@react-navigation/core/src/NavigationBuilderContext';
import invariant from 'invariant';

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
  type ScreenParamList,
} from './route-names';
import LoggedOutModal from '../account/logged-out-modal.react';
import VerificationModal from '../account/verification-modal.react';
import AppNavigator from './app-navigator.react';
import ThreadPickerModal from '../calendar/thread-picker-modal.react';
import AddUsersModal from '../chat/settings/add-users-modal.react';
import CustomServerModal from '../more/custom-server-modal.react';
import ColorPickerModal from '../chat/settings/color-picker-modal.react';
import ComposeSubthreadModal from '../chat/settings/compose-subthread-modal.react';
import RootRouter, { type RootRouterNavigationProp } from './root-router';
import { RootNavigatorContext } from './root-navigator-context';
import { RootContext } from '../root-context';

if (Platform.OS !== "android" || Platform.Version >= 21) {
  // Older Android devices get stack overflows when trying to draw deeply nested
  // view structures. We've tried to get our draw depth down as much as possible
  // without going into React Navigation internals or creating a separate render
  // path for these old Android devices. Because react-native-screens increases
  // the draw depth enough to cause crashes in some scenarios, we disable it
  // here for those devices
  enableScreens();
}

export type RootNavigationProp<
  RouteName: string = $Keys<ScreenParamList>,
> = RootRouterNavigationProp<ScreenParamList, RouteName>;

function RootNavigator({
  initialRouteName,
  children,
  screenOptions,
  ...rest
}) {
  const { state, descriptors, navigation } = useNavigationBuilder(
    RootRouter,
    {
      initialRouteName,
      children,
      screenOptions,
    },
  );

  const [keyboardHandlingEnabled, setKeyboardHandlingEnabled] =
    React.useState(true);
  const rootNavigationContext = React.useMemo(
    () => ({ setKeyboardHandlingEnabled }),
    [setKeyboardHandlingEnabled],
  );

  return (
    <RootNavigatorContext.Provider value={rootNavigationContext}>
      <StackView
        {...rest}
        state={state}
        descriptors={descriptors}
        navigation={navigation}
        keyboardHandlingEnabled={keyboardHandlingEnabled}
      />
    </RootNavigatorContext.Provider>
  );
}
const createRootNavigator = createNavigatorFactory(RootNavigator);

const baseTransitionPreset = Platform.select({
  ios: TransitionPresets.ModalSlideFromBottomIOS,
  default: TransitionPresets.FadeFromBottomAndroid,
});
const transitionPreset = {
  ...baseTransitionPreset,
  cardStyleInterpolator: interpolatorProps => {
    const baseCardStyleInterpolator =
      baseTransitionPreset.cardStyleInterpolator(interpolatorProps);
    const overlayOpacity = interpolatorProps.current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.7],
      extrapolate: 'clamp',
    });
    return {
      ...baseCardStyleInterpolator,
      overlayStyle: {
        ...baseCardStyleInterpolator.overlayStyle,
        opacity: overlayOpacity,
      },
    };
  },
};

const Root = createRootNavigator();
const defaultScreenOptions = {
  gestureEnabled: Platform.OS === 'ios',
  animationEnabled: Platform.OS !== 'web',
  cardStyle: { backgroundColor: 'transparent' },
  ...transitionPreset,
};
const disableGesturesScreenOptions = {
  gestureEnabled: false,
};
const modalOverlayScreenOptions = {
  cardOverlayEnabled: true,
};
export default () => {
  const builderContext = React.useContext(NavigationBuilderContext);
  invariant(
    builderContext && builderContext.trackAction,
    'trackAction should be set in NavigationBuilderContext',
  );
  const baseTrackAction = builderContext.trackAction;

  const rootContext = React.useContext(RootContext);
  invariant(
    rootContext && rootContext.onNavAction,
    'onNavAction should be set in RootContext',
  );
  const { onNavAction } = rootContext;

  const replacedTrackAction = React.useCallback(
    action => {
      onNavAction(action);
      return baseTrackAction(action);
    },
    [onNavAction, baseTrackAction],
  );
  const replacedBuilderContext = React.useMemo(() => ({
    ...builderContext,
    trackAction: replacedTrackAction,
  }), [builderContext, replacedTrackAction]);

  return (
    <NavigationBuilderContext.Provider value={replacedBuilderContext}>
      <Root.Navigator
        mode="modal"
        headerMode="none"
        screenOptions={defaultScreenOptions}
      >
        <Root.Screen
          name={LoggedOutModalRouteName}
          component={LoggedOutModal}
          options={disableGesturesScreenOptions}
        />
        <Root.Screen
          name={VerificationModalRouteName}
          component={VerificationModal}
        />
        <Root.Screen
          name={AppRouteName}
          component={AppNavigator}
        />
        <Root.Screen
          name={ThreadPickerModalRouteName}
          component={ThreadPickerModal}
          options={modalOverlayScreenOptions}
        />
        <Root.Screen
          name={AddUsersModalRouteName}
          component={AddUsersModal}
          options={modalOverlayScreenOptions}
        />
        <Root.Screen
          name={CustomServerModalRouteName}
          component={CustomServerModal}
          options={modalOverlayScreenOptions}
        />
        <Root.Screen
          name={ColorPickerModalRouteName}
          component={ColorPickerModal}
          options={modalOverlayScreenOptions}
        />
        <Root.Screen
          name={ComposeSubthreadModalRouteName}
          component={ComposeSubthreadModal}
          options={modalOverlayScreenOptions}
        />
      </Root.Navigator>
    </NavigationBuilderContext.Provider>
  );
};
