// @flow

import type { RouteProp } from '@react-navigation/native';

import type { TermsAndPrivacyModalParams } from '../account/terms-and-privacy-modal.react';
import type { ThreadPickerModalParams } from '../calendar/thread-picker-modal.react';
import type { ComposeSubchannelParams } from '../chat/compose-subchannel.react';
import type { ImagePasteModalParams } from '../chat/image-paste-modal.react';
import type { MessageListParams } from '../chat/message-list-types';
import type { MultimediaMessageTooltipModalParams } from '../chat/multimedia-message-tooltip-modal.react';
import type { RobotextMessageTooltipModalParams } from '../chat/robotext-message-tooltip-modal.react';
import type { AddUsersModalParams } from '../chat/settings/add-users-modal.react';
import type { ColorSelectorModalParams } from '../chat/settings/color-selector-modal.react';
import type { ComposeSubchannelModalParams } from '../chat/settings/compose-subchannel-modal.react';
import type { DeleteThreadParams } from '../chat/settings/delete-thread.react';
import type { ThreadSettingsMemberTooltipModalParams } from '../chat/settings/thread-settings-member-tooltip-modal.react';
import type { ThreadSettingsParams } from '../chat/settings/thread-settings.react';
import type { SidebarListModalParams } from '../chat/sidebar-list-modal.react';
import type { TextMessageTooltipModalParams } from '../chat/text-message-tooltip-modal.react';
import type { CameraModalParams } from '../media/camera-modal.react';
import type { ImageModalParams } from '../media/image-modal.react';
import type { VideoPlaybackModalParams } from '../media/video-playback-modal.react';
import type { CustomServerModalParams } from '../profile/custom-server-modal.react';
import type { RelationshipListItemTooltipModalParams } from '../profile/relationship-list-item-tooltip-modal.react';
import type { ActionResultModalParams } from './action-result-modal.react';

export const ActionResultModalRouteName = 'ActionResultModal';
export const AddUsersModalRouteName = 'AddUsersModal';
export const AppearancePreferencesRouteName = 'AppearancePreferences';
export const AppRouteName = 'App';
export const AppsRouteName = 'Apps';
export const BackgroundChatThreadListRouteName = 'BackgroundChatThreadList';
export const BlockListRouteName = 'BlockList';
export const BuildInfoRouteName = 'BuildInfo';
export const CalendarRouteName = 'Calendar';
export const CameraModalRouteName = 'CameraModal';
export const ChatRouteName = 'Chat';
export const ChatThreadListRouteName = 'ChatThreadList';
export const ColorSelectorModalRouteName = 'ColorSelectorModal';
export const ComposeSubchannelModalRouteName = 'ComposeSubchannelModal';
export const ComposeSubchannelRouteName = 'ComposeSubchannel';
export const CustomServerModalRouteName = 'CustomServerModal';
export const DefaultNotificationsPreferencesRouteName = 'DefaultNotifications';
export const DeleteAccountRouteName = 'DeleteAccount';
export const DeleteThreadRouteName = 'DeleteThread';
export const DevToolsRouteName = 'DevTools';
export const EditPasswordRouteName = 'EditPassword';
export const FriendListRouteName = 'FriendList';
export const HomeChatThreadListRouteName = 'HomeChatThreadList';
export const ImageModalRouteName = 'ImageModal';
export const ImagePasteModalRouteName = 'ImagePasteModal';
export const LoggedOutModalRouteName = 'LoggedOutModal';
export const MessageListRouteName = 'MessageList';
export const MultimediaMessageTooltipModalRouteName =
  'MultimediaMessageTooltipModal';
export const PrivacyPreferencesRouteName = 'PrivacyPreferences';
export const ProfileRouteName = 'Profile';
export const ProfileScreenRouteName = 'ProfileScreen';
export const RelationshipListItemTooltipModalRouteName =
  'RelationshipListItemTooltipModal';
export const RobotextMessageTooltipModalRouteName =
  'RobotextMessageTooltipModal';
export const SidebarListModalRouteName = 'SidebarListModal';
export const TabNavigatorRouteName = 'TabNavigator';
export const TextMessageTooltipModalRouteName = 'TextMessageTooltipModal';
export const ThreadPickerModalRouteName = 'ThreadPickerModal';
export const ThreadSettingsMemberTooltipModalRouteName =
  'ThreadSettingsMemberTooltipModal';
export const ThreadSettingsRouteName = 'ThreadSettings';
export const VideoPlaybackModalRouteName = 'VideoPlaybackModal';
export const TermsAndPrivacyRouteName = 'TermsAndPrivacyModal';

export type RootParamList = {
  +LoggedOutModal: void,
  +App: void,
  +ThreadPickerModal: ThreadPickerModalParams,
  +AddUsersModal: AddUsersModalParams,
  +CustomServerModal: CustomServerModalParams,
  +ColorSelectorModal: ColorSelectorModalParams,
  +ComposeSubchannelModal: ComposeSubchannelModalParams,
  +SidebarListModal: SidebarListModalParams,
  +ImagePasteModal: ImagePasteModalParams,
  +TermsAndPrivacyModal: TermsAndPrivacyModalParams,
};

export type MessageTooltipRouteNames =
  | typeof RobotextMessageTooltipModalRouteName
  | typeof MultimediaMessageTooltipModalRouteName
  | typeof TextMessageTooltipModalRouteName;

export type TooltipModalParamList = {
  +MultimediaMessageTooltipModal: MultimediaMessageTooltipModalParams,
  +TextMessageTooltipModal: TextMessageTooltipModalParams,
  +ThreadSettingsMemberTooltipModal: ThreadSettingsMemberTooltipModalParams,
  +RelationshipListItemTooltipModal: RelationshipListItemTooltipModalParams,
  +RobotextMessageTooltipModal: RobotextMessageTooltipModalParams,
};

export type OverlayParamList = {
  +TabNavigator: void,
  +ImageModal: ImageModalParams,
  +ActionResultModal: ActionResultModalParams,
  +CameraModal: CameraModalParams,
  +VideoPlaybackModal: VideoPlaybackModalParams,
  ...TooltipModalParamList,
};

export type TabParamList = {
  +Calendar: void,
  +Chat: void,
  +Profile: void,
  +Apps: void,
};

export type ChatParamList = {
  +ChatThreadList: void,
  +MessageList: MessageListParams,
  +ComposeSubchannel: ComposeSubchannelParams,
  +ThreadSettings: ThreadSettingsParams,
  +DeleteThread: DeleteThreadParams,
};

export type ChatTopTabsParamList = {
  +HomeChatThreadList: void,
  +BackgroundChatThreadList: void,
};

export type ProfileParamList = {
  +ProfileScreen: void,
  +EditPassword: void,
  +DeleteAccount: void,
  +BuildInfo: void,
  +DevTools: void,
  +AppearancePreferences: void,
  +PrivacyPreferences: void,
  +DefaultNotifications: void,
  +FriendList: void,
  +BlockList: void,
};

export type ScreenParamList = {
  ...RootParamList,
  ...OverlayParamList,
  ...TabParamList,
  ...ChatParamList,
  ...ChatTopTabsParamList,
  ...ProfileParamList,
};

export type NavigationRoute<
  RouteName: string = $Keys<ScreenParamList>,
> = RouteProp<ScreenParamList, RouteName>;

export const accountModals = [LoggedOutModalRouteName];

export const scrollBlockingModals = [
  ImageModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
  RelationshipListItemTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  VideoPlaybackModalRouteName,
];

export const chatRootModals = [
  AddUsersModalRouteName,
  ColorSelectorModalRouteName,
  ComposeSubchannelModalRouteName,
];

export const threadRoutes = [
  MessageListRouteName,
  ThreadSettingsRouteName,
  DeleteThreadRouteName,
  ComposeSubchannelRouteName,
];
