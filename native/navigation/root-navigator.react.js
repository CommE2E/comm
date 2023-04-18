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

import AppNavigator from './app-navigator.react.js';
import { defaultStackScreenOptions } from './options.js';
import { RootNavigatorContext } from './root-navigator-context.js';
import RootRouter, {
  type RootRouterExtraNavigationHelpers,
} from './root-router.js';
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
  SubchannelsListModalRouteName,
  MessageReactionsModalRouteName,
  type ScreenParamList,
  type RootParamList,
  TermsAndPrivacyRouteName,
  RegistrationRouteName,
} from './route-names.js';
import LoggedOutModal from '../account/logged-out-modal.react.js';
import RegistrationNavigator from '../account/registration/registration-navigator.react.js';
import TermsAndPrivacyModal from '../account/terms-and-privacy-modal.react.js';
import ThreadPickerModal from '../calendar/thread-picker-modal.react.js';
import ImagePasteModal from '../chat/image-paste-modal.react.js';
import MessageReactionsModal from '../chat/message-reactions-modal.react.js';
import AddUsersModal from '../chat/settings/add-users-modal.react.js';
import ColorSelectorModal from '../chat/settings/color-selector-modal.react.js';
import ComposeSubchannelModal from '../chat/settings/compose-subchannel-modal.react.js';
import SidebarListModal from '../chat/sidebar-list-modal.react.js';
import SubchannelsListModal from '../chat/subchannels-list-modal.react.js';
import CustomServerModal from '../profile/custom-server-modal.react.js';

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
  const [keyboardHandlingEnabled, setKeyboardHandlingEnabled] =
    React.useState(true);
  const mergedScreenOptions = React.useMemo(() => {
    if (typeof screenOptions === 'function') {
      return input => ({
        ...screenOptions(input),
        keyboardHandlingEnabled,
      });
    }
    return {
      ...screenOptions,
      keyboardHandlingEnabled,
    };
  }, [screenOptions, keyboardHandlingEnabled]);

  const { state, descriptors, navigation } = useNavigationBuilder(RootRouter, {
    id,
    initialRouteName,
    children,
    screenOptions: mergedScreenOptions,
    defaultScreenOptions,
    screenListeners,
  });

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
    const baseCardStyleInterpolator =
      baseTransitionPreset.cardStyleInterpolator(interpolatorProps);
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
  ...transitionPreset,
  cardStyle: { backgroundColor: 'transparent' },
  presentation: 'modal',
  headerShown: false,
};
const disableGesturesScreenOptions = {
  gestureEnabled: false,
};
const modalOverlayScreenOptions = {
  cardOverlayEnabled: true,
  presentation: 'transparentModal',
};
const termsAndPrivacyModalScreenOptions = {
  gestureEnabled: false,
  cardOverlayEnabled: true,
  presentation: 'transparentModal',
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
    <Root.Navigator screenOptions={defaultScreenOptions}>
      <Root.Screen
        name={LoggedOutModalRouteName}
        component={LoggedOutModal}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen
        name={RegistrationRouteName}
        component={RegistrationNavigator}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen name={AppRouteName} component={AppNavigator} />
      <Root.Screen
        name={TermsAndPrivacyRouteName}
        component={TermsAndPrivacyModal}
        options={termsAndPrivacyModalScreenOptions}
      />
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
      <Root.Screen
        name={SubchannelsListModalRouteName}
        component={SubchannelsListModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={MessageReactionsModalRouteName}
        component={MessageReactionsModal}
        options={modalOverlayScreenOptions}
      />
    </Root.Navigator>
  );
}
export default RootComponent;
