// @flow

import {
  createNavigatorFactory,
  useNavigationBuilder,
  type StackNavigationState,
  type StackOptions,
  type StackNavigationEventMap,
  type StackNavigatorProps,
  type ExtraStackNavigatorProps,
} from '@react-navigation/native';
import { StackView, TransitionPresets } from '@react-navigation/stack';
import * as React from 'react';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

import LoggedOutModal from '../account/logged-out-modal.react';
import ThreadPickerModal from '../calendar/thread-picker-modal.react';
import ImagePasteModal from '../chat/image-paste-modal.react';
import AddUsersModal from '../chat/settings/add-users-modal.react';
import ColorSelectorModal from '../chat/settings/color-selector-modal.react';
import ComposeSubchannelModal from '../chat/settings/compose-subchannel-modal.react';
import SidebarListModal from '../chat/sidebar-list-modal.react';
import CustomServerModal from '../profile/custom-server-modal.react';
import AppNavigator from './app-navigator.react';
import { defaultStackScreenOptions } from './options';
import { RootNavigatorContext } from './root-navigator-context';
import RootRouter, { type RootRouterNavigationProp } from './root-router';
import {
  LoggedOutModalRouteName,
  AppRouteName,
  ThreadPickerModalRouteName,
  ImagePasteModalRouteName,
  AddUsersModalRouteName,
  CustomServerModalRouteName,
  ColorSelectorModalRouteName,
  ComposeSubchannelModalRouteName,
  SidebarListModalRouteName,
  type ScreenParamList,
  type RootParamList,
  SIWEModalRouteName,
} from "./route-names";
import {SIWEModal} from "../account/siwe-modal.react";

enableScreens();

type RootNavigatorProps = StackNavigatorProps<RootRouterNavigationProp<>>;
function RootNavigator({
  initialRouteName,
  children,
  screenOptions,
  ...rest
}: RootNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder(RootRouter, {
    initialRouteName,
    children,
    screenOptions,
  });

  const [keyboardHandlingEnabled, setKeyboardHandlingEnabled] = React.useState(
    true,
  );
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
        detachInactiveScreens={Platform.OS !== 'ios'}
      />
    </RootNavigatorContext.Provider>
  );
}
const createRootNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  RootRouterNavigationProp<>,
  ExtraStackNavigatorProps,
>(RootNavigator);

const baseTransitionPreset = Platform.select({
  ios: TransitionPresets.ModalSlideFromBottomIOS,
  default: TransitionPresets.FadeFromBottomAndroid,
});
const transitionPreset = {
  ...baseTransitionPreset,
  cardStyleInterpolator: interpolatorProps => {
    const baseCardStyleInterpolator = baseTransitionPreset.cardStyleInterpolator(
      interpolatorProps,
    );
    const overlayOpacity = interpolatorProps.current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: ([0, 0.7]: number[]), // Flow...
      extrapolate: 'clamp',
    });
    return {
      ...baseCardStyleInterpolator,
      overlayStyle: [
        baseCardStyleInterpolator.overlayStyle,
        { opacity: overlayOpacity },
      ],
    };
  },
};

const defaultScreenOptions = {
  ...defaultStackScreenOptions,
  cardStyle: { backgroundColor: 'transparent' },
  ...transitionPreset,
};
const disableGesturesScreenOptions = {
  gestureEnabled: false,
};
const modalOverlayScreenOptions = {
  cardOverlayEnabled: true,
};

export type RootNavigationProp<
  RouteName: $Keys<ScreenParamList> = $Keys<ScreenParamList>,
> = RootRouterNavigationProp<ScreenParamList, RouteName>;

const Root = createRootNavigator<
  ScreenParamList,
  RootParamList,
  RootNavigationProp<>,
>();
function RootComponent(): React.Node {
  return (
    <Root.Navigator
      mode="modal"
      headerMode="none"
      screenOptions={defaultScreenOptions}
    >
      <Root.Screen
        name={LoggedOutModalRouteName}
        component={SIWEModal}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen
        name={SIWEModalRouteName}
        component={SIWEModal}
        options={modalOverlayScreenOptions}
      />

      <Root.Screen name={AppRouteName} component={AppNavigator} />
      <Root.Screen
        name={ThreadPickerModalRouteName}
        component={ThreadPickerModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ImagePasteModalRouteName}
        component={ImagePasteModal}
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
        name={ColorSelectorModalRouteName}
        component={ColorSelectorModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ComposeSubchannelModalRouteName}
        component={ComposeSubchannelModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={SidebarListModalRouteName}
        component={SidebarListModal}
        options={modalOverlayScreenOptions}
      />
    </Root.Navigator>
  );
}
export default RootComponent;
