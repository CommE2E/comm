// @flow

import {
  createNavigatorFactory,
  useNavigationBuilder,
  type StackNavigationState,
  type StackOptions,
  type StackNavigationEventMap,
  type StackNavigatorProps,
  type ExtraStackNavigatorProps,
  type ParamListBase,
  type StackNavigationHelpers,
  type StackNavigationProp,
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
import RootRouter, {
  type RootRouterExtraNavigationHelpers,
} from './root-router';
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
} from './route-names';

enableScreens();

export type RootNavigationHelpers<ParamList: ParamListBase = ParamListBase> = {
  ...$Exact<StackNavigationHelpers<ParamList>>,
  ...RootRouterExtraNavigationHelpers,
  ...
};

type RootNavigatorProps = StackNavigatorProps<RootNavigationHelpers<>>;
function RootNavigator({
  initialRouteName,
  children,
  screenOptions,
  defaultScreenOptions,
  screenListeners,
  id,
  ...rest
}: RootNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder(RootRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
    defaultScreenOptions,
    screenListeners,
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
  RootNavigationHelpers<>,
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

export type RootRouterNavigationProp<
  ParamList: ParamListBase = ParamListBase,
  RouteName: $Keys<ParamList> = $Keys<ParamList>,
> = {
  ...StackNavigationProp<ParamList, RouteName>,
  ...RootRouterExtraNavigationHelpers,
};

export type RootNavigationProp<
  RouteName: $Keys<ScreenParamList> = $Keys<ScreenParamList>,
> = {
  ...StackNavigationProp<ScreenParamList, RouteName>,
  ...RootRouterExtraNavigationHelpers,
};

const Root = createRootNavigator<
  ScreenParamList,
  RootParamList,
  RootNavigationHelpers<ScreenParamList>,
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
        component={LoggedOutModal}
        options={disableGesturesScreenOptions}
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
