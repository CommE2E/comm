// @flow

import type { RouteProp } from '@react-navigation/native';

import type { ActionResultModalParams } from './action-result-modal.react.js';
import type { InviteLinkModalParams } from './invite-link-modal.react';
import type { AvatarSelectionParams } from '../account/registration/avatar-selection.react.js';
import type { ConnectEthereumParams } from '../account/registration/connect-ethereum.react.js';
import type { EmojiAvatarSelectionParams } from '../account/registration/emoji-avatar-selection.react.js';
import type { ExistingEthereumAccountParams } from '../account/registration/existing-ethereum-account.react.js';
import type { KeyserverSelectionParams } from '../account/registration/keyserver-selection.react.js';
import type { PasswordSelectionParams } from '../account/registration/password-selection.react.js';
import type { RegistrationTermsParams } from '../account/registration/registration-terms.react.js';
import type { UsernameSelectionParams } from '../account/registration/username-selection.react.js';
import type { TermsAndPrivacyModalParams } from '../account/terms-and-privacy-modal.react.js';
import type { ThreadPickerModalParams } from '../calendar/thread-picker-modal.react.js';
import type { ComposeSubchannelParams } from '../chat/compose-subchannel.react.js';
import type { FullScreenThreadMediaGalleryParams } from '../chat/fullscreen-thread-media-gallery.react.js';
import type { ImagePasteModalParams } from '../chat/image-paste-modal.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import type { MessageReactionsModalParams } from '../chat/message-reactions-modal.react.js';
import type { MessageResultsScreenParams } from '../chat/message-results-screen.react.js';
import type { MultimediaMessageTooltipModalParams } from '../chat/multimedia-message-tooltip-modal.react.js';
import type { RobotextMessageTooltipModalParams } from '../chat/robotext-message-tooltip-modal.react.js';
import type { AddUsersModalParams } from '../chat/settings/add-users-modal.react.js';
import type { ColorSelectorModalParams } from '../chat/settings/color-selector-modal.react.js';
import type { ComposeSubchannelModalParams } from '../chat/settings/compose-subchannel-modal.react.js';
import type { DeleteThreadParams } from '../chat/settings/delete-thread.react.js';
import type { EmojiThreadAvatarCreationParams } from '../chat/settings/emoji-thread-avatar-creation.react.js';
import type { ThreadSettingsMemberTooltipModalParams } from '../chat/settings/thread-settings-member-tooltip-modal.react.js';
import type { ThreadSettingsParams } from '../chat/settings/thread-settings.react.js';
import type { SidebarListModalParams } from '../chat/sidebar-list-modal.react.js';
import type { SubchannelListModalParams } from '../chat/subchannels-list-modal.react.js';
import type { TextMessageTooltipModalParams } from '../chat/text-message-tooltip-modal.react.js';
import type { TogglePinModalParams } from '../chat/toggle-pin-modal.react.js';
import type { CommunityCreationMembersScreenParams } from '../community-creation/community-creation-members.react.js';
import type { ManagePublicLinkScreenParams } from '../invite-links/manage-public-link-screen.react.js';
import type { ViewInviteLinksScreenParams } from '../invite-links/view-invite-links-screen.react.js';
import type { ChatCameraModalParams } from '../media/chat-camera-modal.react.js';
import type { ImageModalParams } from '../media/image-modal.react.js';
import type { ThreadAvatarCameraModalParams } from '../media/thread-avatar-camera-modal.react.js';
import type { VideoPlaybackModalParams } from '../media/video-playback-modal.react.js';
import type { CustomServerModalParams } from '../profile/custom-server-modal.react.js';
import type { RelationshipListItemTooltipModalParams } from '../profile/relationship-list-item-tooltip-modal.react.js';
import type { ChangeRolesScreenParams } from '../roles/change-roles-screen.react.js';
import type { CommunityRolesScreenParams } from '../roles/community-roles-screen.react.js';
import type { CreateRolesScreenParams } from '../roles/create-roles-screen.react.js';
import type { MessageSearchParams } from '../search/message-search.react.js';

export const ActionResultModalRouteName = 'ActionResultModal';
export const AddUsersModalRouteName = 'AddUsersModal';
export const AppearancePreferencesRouteName = 'AppearancePreferences';
export const AppRouteName = 'App';
export const AppsRouteName = 'Apps';
export const BackgroundChatThreadListRouteName = 'BackgroundChatThreadList';
export const BlockListRouteName = 'BlockList';
export const BuildInfoRouteName = 'BuildInfo';
export const CalendarRouteName = 'Calendar';
export const ChangeRolesScreenRouteName = 'ChangeRolesScreen';
export const ChatCameraModalRouteName = 'ChatCameraModal';
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
export const EmojiThreadAvatarCreationRouteName = 'EmojiThreadAvatarCreation';
export const EmojiUserAvatarCreationRouteName = 'EmojiUserAvatarCreation';
export const FriendListRouteName = 'FriendList';
export const FullScreenThreadMediaGalleryRouteName =
  'FullScreenThreadMediaGallery';
export const HomeChatThreadListRouteName = 'HomeChatThreadList';
export const ImageModalRouteName = 'ImageModal';
export const ImagePasteModalRouteName = 'ImagePasteModal';
export const InviteLinkModalRouteName = 'InviteLinkModal';
export const InviteLinkNavigatorRouteName = 'InviteLinkNavigator';
export const LinkedDevicesRouteName = 'LinkedDevices';
export const LoggedOutModalRouteName = 'LoggedOutModal';
export const ManagePublicLinkRouteName = 'ManagePublicLink';
export const MessageListRouteName = 'MessageList';
export const MessageReactionsModalRouteName = 'MessageReactionsModal';
export const MessageResultsScreenRouteName = 'MessageResultsScreen';
export const MultimediaMessageTooltipModalRouteName =
  'MultimediaMessageTooltipModal';
export const PrivacyPreferencesRouteName = 'PrivacyPreferences';
export const ProfileRouteName = 'Profile';
export const ProfileScreenRouteName = 'ProfileScreen';
export const RelationshipListItemTooltipModalRouteName =
  'RelationshipListItemTooltipModal';
export const RobotextMessageTooltipModalRouteName =
  'RobotextMessageTooltipModal';
export const SecondaryDeviceQRCodeScannerRouteName =
  'SecondaryDeviceQRCodeScanner';
export const SidebarListModalRouteName = 'SidebarListModal';
export const SubchannelsListModalRouteName = 'SubchannelsListModal';
export const TabNavigatorRouteName = 'TabNavigator';
export const TextMessageTooltipModalRouteName = 'TextMessageTooltipModal';
export const ThreadAvatarCameraModalRouteName = 'ThreadAvatarCameraModal';
export const ThreadPickerModalRouteName = 'ThreadPickerModal';
export const ThreadSettingsMemberTooltipModalRouteName =
  'ThreadSettingsMemberTooltipModal';
export const ThreadSettingsRouteName = 'ThreadSettings';
export const UserAvatarCameraModalRouteName = 'UserAvatarCameraModal';
export const TogglePinModalRouteName = 'TogglePinModal';
export const VideoPlaybackModalRouteName = 'VideoPlaybackModal';
export const ViewInviteLinksRouteName = 'ViewInviteLinks';
export const TermsAndPrivacyRouteName = 'TermsAndPrivacyModal';
export const RegistrationRouteName = 'Registration';
export const KeyserverSelectionRouteName = 'KeyserverSelection';
export const CoolOrNerdModeSelectionRouteName = 'CoolOrNerdModeSelection';
export const ConnectEthereumRouteName = 'ConnectEthereum';
export const ExistingEthereumAccountRouteName = 'ExistingEthereumAccount';
export const UsernameSelectionRouteName = 'UsernameSelection';
export const CommunityCreationRouteName = 'CommunityCreation';
export const CommunityConfigurationRouteName = 'CommunityConfiguration';
export const CommunityCreationMembersRouteName = 'CommunityCreationMembers';
export const MessageSearchRouteName = 'MessageSearch';
export const PasswordSelectionRouteName = 'PasswordSelection';
export const AvatarSelectionRouteName = 'AvatarSelection';
export const EmojiAvatarSelectionRouteName = 'EmojiAvatarSelection';
export const RegistrationUserAvatarCameraModalRouteName =
  'RegistrationUserAvatarCameraModal';
export const RegistrationTermsRouteName = 'RegistrationTerms';
export const RolesNavigatorRouteName = 'RolesNavigator';
export const CommunityRolesScreenRouteName = 'CommunityRolesScreen';
export const CreateRolesScreenRouteName = 'CreateRolesScreen';

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
  +Registration: void,
  +CommunityCreation: void,
  +InviteLinkModal: InviteLinkModalParams,
  +InviteLinkNavigator: void,
  +RolesNavigator: void,
};

export type MessageTooltipRouteNames =
  | typeof RobotextMessageTooltipModalRouteName
  | typeof MultimediaMessageTooltipModalRouteName
  | typeof TextMessageTooltipModalRouteName;

export const PinnableMessageTooltipRouteNames = [
  TextMessageTooltipModalRouteName,
  MultimediaMessageTooltipModalRouteName,
];

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
  +ChatCameraModal: ChatCameraModalParams,
  +UserAvatarCameraModal: void,
  +ThreadAvatarCameraModal: ThreadAvatarCameraModalParams,
  +VideoPlaybackModal: VideoPlaybackModalParams,
  +TogglePinModal: TogglePinModalParams,
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
  +EmojiThreadAvatarCreation: EmojiThreadAvatarCreationParams,
  +DeleteThread: DeleteThreadParams,
  +FullScreenThreadMediaGallery: FullScreenThreadMediaGalleryParams,
  +MessageResultsScreen: MessageResultsScreenParams,
  +MessageSearch: MessageSearchParams,
  +ChangeRolesScreen: ChangeRolesScreenParams,
};

export type ChatTopTabsParamList = {
  +HomeChatThreadList: void,
  +BackgroundChatThreadList: void,
};

export type ProfileParamList = {
  +ProfileScreen: void,
  +EmojiUserAvatarCreation: void,
  +EditPassword: void,
  +DeleteAccount: void,
  +BuildInfo: void,
  +DevTools: void,
  +AppearancePreferences: void,
  +PrivacyPreferences: void,
  +DefaultNotifications: void,
  +FriendList: void,
  +BlockList: void,
  +LinkedDevices: void,
  +SecondaryDeviceQRCodeScanner: void,
};

export type CommunityDrawerParamList = { +TabNavigator: void };

export type RegistrationParamList = {
  +CoolOrNerdModeSelection: void,
  +KeyserverSelection: KeyserverSelectionParams,
  +ConnectEthereum: ConnectEthereumParams,
  +ExistingEthereumAccount: ExistingEthereumAccountParams,
  +UsernameSelection: UsernameSelectionParams,
  +PasswordSelection: PasswordSelectionParams,
  +AvatarSelection: AvatarSelectionParams,
  +EmojiAvatarSelection: EmojiAvatarSelectionParams,
  +RegistrationUserAvatarCameraModal: void,
  +RegistrationTerms: RegistrationTermsParams,
};

export type InviteLinkParamList = {
  +ViewInviteLinks: ViewInviteLinksScreenParams,
  +ManagePublicLink: ManagePublicLinkScreenParams,
};

export type CommunityCreationParamList = {
  +CommunityConfiguration: void,
  +CommunityCreationMembers: CommunityCreationMembersScreenParams,
};

export type RolesParamList = {
  +CommunityRolesScreen: CommunityRolesScreenParams,
  +CreateRolesScreen: CreateRolesScreenParams,
};

export type ScreenParamList = {
  ...RootParamList,
  ...OverlayParamList,
  ...TabParamList,
  ...ChatParamList,
  ...ChatTopTabsParamList,
  ...ProfileParamList,
  ...CommunityDrawerParamList,
  ...RegistrationParamList,
  ...InviteLinkParamList,
  ...CommunityCreationParamList,
  ...RolesParamList,
};

export type NavigationRoute<RouteName: string = $Keys<ScreenParamList>> =
  RouteProp<ScreenParamList, RouteName>;

export const accountModals = [LoggedOutModalRouteName, RegistrationRouteName];

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
  MessageResultsScreenRouteName,
  MessageSearchRouteName,
  EmojiThreadAvatarCreationRouteName,
  CommunityRolesScreenRouteName,
];
