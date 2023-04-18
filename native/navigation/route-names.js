// @flow

import type { RouteProp } from '@react-navigation/native';

import type { ActionResultModalParams } from './action-result-modal.react.js';
import type { TermsAndPrivacyModalParams } from '../account/terms-and-privacy-modal.react.js';
import type { EmojiAvatarCreationParams } from '../avatars/emoji-avatar-creation.react.js';
import type { ThreadPickerModalParams } from '../calendar/thread-picker-modal.react.js';
import type { ComposeSubchannelParams } from '../chat/compose-subchannel.react.js';
import type { FullScreenThreadMediaGalleryParams } from '../chat/fullscreen-thread-media-gallery.react.js';
import type { ImagePasteModalParams } from '../chat/image-paste-modal.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import type { MessageReactionsModalParams } from '../chat/message-reactions-modal.react.js';
import type { MultimediaMessageTooltipModalParams } from '../chat/multimedia-message-tooltip-modal.react.js';
import type { RobotextMessageTooltipModalParams } from '../chat/robotext-message-tooltip-modal.react.js';
import type { AddUsersModalParams } from '../chat/settings/add-users-modal.react.js';
import type { ColorSelectorModalParams } from '../chat/settings/color-selector-modal.react.js';
import type { ComposeSubchannelModalParams } from '../chat/settings/compose-subchannel-modal.react.js';
import type { DeleteThreadParams } from '../chat/settings/delete-thread.react.js';
import type { ThreadSettingsMemberTooltipModalParams } from '../chat/settings/thread-settings-member-tooltip-modal.react.js';
import type { ThreadSettingsParams } from '../chat/settings/thread-settings.react.js';
import type { SidebarListModalParams } from '../chat/sidebar-list-modal.react.js';
import type { SubchannelListModalParams } from '../chat/subchannels-list-modal.react.js';
import type { TextMessageTooltipModalParams } from '../chat/text-message-tooltip-modal.react.js';
import type { CameraModalParams } from '../media/camera-modal.react.js';
import type { ImageModalParams } from '../media/image-modal.react.js';
import type { VideoPlaybackModalParams } from '../media/video-playback-modal.react.js';
import type { CustomServerModalParams } from '../profile/custom-server-modal.react.js';
import type { RelationshipListItemTooltipModalParams } from '../profile/relationship-list-item-tooltip-modal.react.js';

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
export const CommunityDrawerNavigatorRouteName = 'CommunityDrawerNavigator';
export const CustomServerModalRouteName = 'CustomServerModal';
export const DefaultNotificationsPreferencesRouteName = 'DefaultNotifications';
export const DeleteAccountRouteName = 'DeleteAccount';
export const DeleteThreadRouteName = 'DeleteThread';
export const DevToolsRouteName = 'DevTools';
export const EditPasswordRouteName = 'EditPassword';
export const EmojiAvatarCreationRouteName = 'EmojiAvatarCreation';
export const FriendListRouteName = 'FriendList';
export const FullScreenThreadMediaGalleryRouteName =
  'FullScreenThreadMediaGallery';
export const HomeChatThreadListRouteName = 'HomeChatThreadList';
export const ImageModalRouteName = 'ImageModal';
export const ImagePasteModalRouteName = 'ImagePasteModal';
export const LoggedOutModalRouteName = 'LoggedOutModal';
export const MessageListRouteName = 'MessageList';
export const MessageReactionsModalRouteName = 'MessageReactionsModal';
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
export const SubchannelsListModalRouteName = 'SubchannelsListModal';
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
  +SubchannelsListModal: SubchannelListModalParams,
  +MessageReactionsModal: MessageReactionsModalParams,
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
  +CommunityDrawerNavigator: void,
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
  +EmojiAvatarCreation: EmojiAvatarCreationParams,
  +DeleteThread: DeleteThreadParams,
  +FullScreenThreadMediaGallery: FullScreenThreadMediaGalleryParams,
};

export type ChatTopTabsParamList = {
  +HomeChatThreadList: void,
  +BackgroundChatThreadList: void,
};

export type ProfileParamList = {
  +ProfileScreen: void,
  +EmojiAvatarCreation: EmojiAvatarCreationParams,
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

export type CommunityDrawerParamList = { +TabNavigator: void };

export type ScreenParamList = {
  ...RootParamList,
  ...OverlayParamList,
  ...TabParamList,
  ...ChatParamList,
  ...ChatTopTabsParamList,
  ...ProfileParamList,
  ...CommunityDrawerParamList,
};

export type NavigationRoute<RouteName: string = $Keys<ScreenParamList>> =
  RouteProp<ScreenParamList, RouteName>;

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
  FullScreenThreadMediaGalleryRouteName,
];
