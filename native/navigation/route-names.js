// @flow

import type {
  NavigationParams,
  NavigationNavigateAction,
} from 'react-navigation';

export type Navigate = ({
  routeName: string,
  params?: NavigationParams,
  action?: NavigationNavigateAction,
  key?: string,
}) => bool;

export const AppRouteName = 'App';
export const TabNavigatorRouteName = 'TabNavigator';
export const ComposeThreadRouteName = 'ComposeThread';
export const DeleteThreadRouteName = 'DeleteThread';
export const ThreadSettingsRouteName = 'ThreadSettings';
export const MessageListRouteName = 'MessageList';
export const VerificationModalRouteName = 'VerificationModal';
export const LoggedOutModalRouteName = 'LoggedOutModal';
export const MoreRouteName = 'More';
export const MoreScreenRouteName = 'MoreScreen';
export const ChatRouteName = "Chat";
export const ChatThreadListRouteName = 'ChatThreadList';
export const CalendarRouteName = 'Calendar';
export const BuildInfoRouteName = 'BuildInfo';
export const DeleteAccountRouteName = 'DeleteAccount';
export const DevToolsRouteName = 'DevTools';
export const EditEmailRouteName = 'EditEmail';
export const EditPasswordRouteName = 'EditPassword';
export const AppearancePreferencesRouteName = 'AppearancePreferences';
export const ThreadPickerModalRouteName = 'ThreadPickerModal';
export const AddUsersModalRouteName = 'AddUsersModal';
export const CustomServerModalRouteName = 'CustomServerModal';
export const ColorPickerModalRouteName = 'ColorPickerModal';
export const ComposeSubthreadModalRouteName = 'ComposeSubthreadModal';
export const MultimediaModalRouteName = 'MultimediaModal';
export const MultimediaTooltipModalRouteName = 'MultimediaTooltipModal';
export const ActionResultModalRouteName = 'ActionResultModal';
export const TextMessageTooltipModalRouteName = 'TextMessageTooltipModal';
export const ThreadSettingsMemberTooltipModalRouteName =
  'ThreadSettingsMemberTooltipModal';

export const accountModals = [
  LoggedOutModalRouteName,
  VerificationModalRouteName,
];

export const scrollBlockingChatModals = [
  MultimediaModalRouteName,
  MultimediaTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
];
