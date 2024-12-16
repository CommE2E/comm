// @flow

import type { RouteProp } from '@react-navigation/core';

import type { ActionResultModalParams } from './action-result-modal.react.js';
import type { InviteLinkModalParams } from './invite-link-modal.react';
import type { ConnectSecondaryDeviceParams } from '../account/qr-auth/connect-secondary-device.react.js';
import type { AvatarSelectionParams } from '../account/registration/avatar-selection.react.js';
import type { ConnectEthereumParams } from '../account/registration/connect-ethereum.react.js';
import type { ConnectFarcasterParams } from '../account/registration/connect-farcaster.react.js';
import type { EmojiAvatarSelectionParams } from '../account/registration/emoji-avatar-selection.react.js';
import type { ExistingEthereumAccountParams } from '../account/registration/existing-ethereum-account.react.js';
import type { KeyserverSelectionParams } from '../account/registration/keyserver-selection.react.js';
import type { PasswordSelectionParams } from '../account/registration/password-selection.react.js';
import type { RegistrationTermsParams } from '../account/registration/registration-terms.react.js';
import type { CreateSIWEBackupMessageParams } from '../account/registration/siwe-backup-message-creation.react.js';
import type { UsernameSelectionParams } from '../account/registration/username-selection.react.js';
import type { RestoreBackupScreenParams } from '../account/restore-backup-screen.react';
import type { TermsAndPrivacyModalParams } from '../account/terms-and-privacy-modal.react.js';
import type { RestoreSIWEBackupParams } from '../backup/restore-siwe-backup.react.js';
import type { ThreadPickerModalParams } from '../calendar/thread-picker-modal.react.js';
import type { ComposeSubchannelParams } from '../chat/compose-subchannel.react.js';
import type { FullScreenThreadMediaGalleryParams } from '../chat/fullscreen-thread-media-gallery.react.js';
import type { ImagePasteModalParams } from '../chat/image-paste-modal.react.js';
import type { MessageListParams } from '../chat/message-list-types.js';
import type { MessageReactionsModalParams } from '../chat/message-reactions-modal.react.js';
import type { MultimediaMessageTooltipModalParams } from '../chat/multimedia-message-tooltip-modal.react.js';
import type { PinnedMessagesScreenParams } from '../chat/pinned-messages-screen.react.js';
import type { RobotextMessageTooltipModalParams } from '../chat/robotext-message-tooltip-modal.react.js';
import type { AddUsersModalParams } from '../chat/settings/add-users-modal.react.js';
import type { ColorSelectorModalParams } from '../chat/settings/color-selector-modal.react.js';
import type { ComposeSubchannelModalParams } from '../chat/settings/compose-subchannel-modal.react.js';
import type { DeleteThreadParams } from '../chat/settings/delete-thread.react.js';
import type { EmojiThreadAvatarCreationParams } from '../chat/settings/emoji-thread-avatar-creation.react.js';
import type { ThreadSettingsMemberTooltipModalParams } from '../chat/settings/thread-settings-member-tooltip-modal.react.js';
import type { ThreadSettingsNotificationsParams } from '../chat/settings/thread-settings-notifications.react.js';
import type { ThreadSettingsParams } from '../chat/settings/thread-settings.react.js';
import type { SidebarListModalParams } from '../chat/sidebar-list-modal.react.js';
import type { SubchannelListModalParams } from '../chat/subchannels-list-modal.react.js';
import type { TextMessageTooltipModalParams } from '../chat/text-message-tooltip-modal.react.js';
import type { TogglePinModalParams } from '../chat/toggle-pin-modal.react.js';
import type { TagFarcasterChannelByNameParams } from '../community-settings/tag-farcaster-channel/tag-farcaster-channel-by-name.react.js';
import type { TagFarcasterChannelParams } from '../community-settings/tag-farcaster-channel/tag-farcaster-channel.react.js';
import type { InviteLinksNavigatorParams } from '../invite-links/invite-links-navigator.react.js';
import type { ManagePublicLinkScreenParams } from '../invite-links/manage-public-link-screen.react.js';
import type { ViewInviteLinksScreenParams } from '../invite-links/view-invite-links-screen.react.js';
import type { ChatCameraModalParams } from '../media/chat-camera-modal.react.js';
import type { ImageModalParams } from '../media/image-modal.react.js';
import type { ThreadAvatarCameraModalParams } from '../media/thread-avatar-camera-modal.react.js';
import type { VideoPlaybackModalParams } from '../media/video-playback-modal.react.js';
import type { CustomServerModalParams } from '../profile/custom-server-modal.react.js';
import type { KeyserverSelectionBottomSheetParams } from '../profile/keyserver-selection-bottom-sheet.react.js';
import type { LinkedDevicesBottomSheetParams } from '../profile/linked-devices-bottom-sheet.react.js';
import type { UserRelationshipTooltipModalParams } from '../profile/user-relationship-tooltip-modal.react.js';
import type { ChangeRolesScreenParams } from '../roles/change-roles-screen.react.js';
import type { CommunityRolesScreenParams } from '../roles/community-roles-screen.react.js';
import type { CreateRolesScreenParams } from '../roles/create-roles-screen.react.js';
import type { MessageSearchParams } from '../search/message-search.react.js';
import type { NUXTipsOverlayParams } from '../tooltip/nux-tips-overlay.react.js';
import type { UserProfileAvatarModalParams } from '../user-profile/user-profile-avatar-modal.react.js';
import type { UserProfileBottomSheetParams } from '../user-profile/user-profile-bottom-sheet.react.js';

export const ActionResultModalRouteName = 'ActionResultModal';
export const AddUsersModalRouteName = 'AddUsersModal';
export const AppearancePreferencesRouteName = 'AppearancePreferences';
export const AppRouteName = 'App';
export const AppsRouteName = 'Apps';
export const BackgroundChatThreadListRouteName = 'BackgroundChatThreadList';
export const BackupMenuRouteName = 'BackupMenu';
export const BlockListRouteName = 'BlockList';
export const BuildInfoRouteName = 'BuildInfo';
export const CalendarRouteName = 'Calendar';
export const CalendarScreenRouteName = 'CalendarScreen';
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
export const LinkedDevicesBottomSheetRouteName = 'LinkedDevicesBottomSheet';
export const LoggedOutModalRouteName = 'LoggedOutModal';
export const ManagePublicLinkRouteName = 'ManagePublicLink';
export const MessageListRouteName = 'MessageList';
export const MessageReactionsModalRouteName = 'MessageReactionsModal';
export const PinnedMessagesScreenRouteName = 'PinnedMessagesScreen';
export const MultimediaMessageTooltipModalRouteName =
  'MultimediaMessageTooltipModal';
export const PrivacyPreferencesRouteName = 'PrivacyPreferences';
export const ProfileRouteName = 'Profile';
export const ProfileScreenRouteName = 'ProfileScreen';
export const UserRelationshipTooltipModalRouteName =
  'UserRelationshipTooltipModal';
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
export const TunnelbrokerMenuRouteName = 'TunnelbrokerMenu';
export const UserAvatarCameraModalRouteName = 'UserAvatarCameraModal';
export const TogglePinModalRouteName = 'TogglePinModal';
export const VideoPlaybackModalRouteName = 'VideoPlaybackModal';
export const ViewInviteLinksRouteName = 'ViewInviteLinks';
export const TermsAndPrivacyRouteName = 'TermsAndPrivacyModal';
export const RegistrationRouteName = 'Registration';
export const KeyserverSelectionRouteName = 'KeyserverSelection';
export const CoolOrNerdModeSelectionRouteName = 'CoolOrNerdModeSelection';
export const ConnectEthereumRouteName = 'ConnectEthereum';
export const CreateSIWEBackupMessageRouteName = 'CreateSIWEBackupMessage';
export const CreateMissingSIWEBackupMessageRouteName =
  'CreateMissingSIWEBackupMessage';
export const RestoreSIWEBackupRouteName = 'RestoreSIWEBackup';
export const ExistingEthereumAccountRouteName = 'ExistingEthereumAccount';
export const ConnectFarcasterRouteName = 'ConnectFarcaster';
export const UsernameSelectionRouteName = 'UsernameSelection';
export const CommunityCreationRouteName = 'CommunityCreation';
export const CommunityConfigurationRouteName = 'CommunityConfiguration';
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
export const SignInNavigatorRouteName = 'SignInNavigator';
export const QRCodeScreenRouteName = 'QRCodeScreen';
export const RestorePromptScreenRouteName = 'RestorePromptScreen';
export const RestorePasswordAccountScreenRouteName =
  'RestorePasswordAccountScreen';
export const RestoreBackupScreenRouteName = 'RestoreBackupScreen';
export const UserProfileBottomSheetNavigatorRouteName =
  'UserProfileBottomSheetNavigator';
export const UserProfileBottomSheetRouteName = 'UserProfileBottomSheet';
export const UserProfileAvatarModalRouteName = 'UserProfileAvatarModal';
export const KeyserverSelectionListRouteName = 'KeyserverSelectionList';
export const AddKeyserverRouteName = 'AddKeyserver';
export const KeyserverSelectionBottomSheetRouteName =
  'KeyserverSelectionBottomSheet';
export const AccountDoesNotExistRouteName = 'AccountDoesNotExist';
export const FarcasterAccountSettingsRouteName = 'FarcasterAccountSettings';
export const ConnectFarcasterBottomSheetRouteName =
  'ConnectFarcasterBottomSheet';
export const TagFarcasterChannelNavigatorRouteName =
  'TagFarcasterChannelNavigator';
export const TagFarcasterChannelRouteName = 'TagFarcasterChannel';
export const TagFarcasterChannelByNameRouteName = 'TagFarcasterChannelByName';
export const ThreadSettingsNotificationsRouteName =
  'ThreadSettingsNotifications';
export const IntroTipRouteName = 'IntroTip';
export const CommunityDrawerTipRouteName = 'CommunityDrawerTip';
export const HomeTabTipRouteName = 'HomeTabTip';
export const MutedTabTipRouteName = 'MutedTabTip';
export const NUXTipOverlayBackdropRouteName = 'NUXTipOverlayBackdrop';
export const QRAuthNavigatorRouteName = 'QRAuthNavigator';
export const QRAuthNotPrimaryDeviceRouteName = 'QRAuthNotPrimaryDevice';
export const ConnectSecondaryDeviceRouteName = 'ConnectSecondaryDevice';
export const SecondaryDeviceConnectedRouteName = 'SecondaryDeviceConnected';
export const SecondaryDeviceNotRespondingRouteName =
  'SecondaryDeviceNotResponding';

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
  +InviteLinkNavigator: InviteLinksNavigatorParams,
  +RolesNavigator: void,
  +SignInNavigator: void,
  +UserProfileBottomSheetNavigator: void,
  +TunnelbrokerMenu: void,
  +KeyserverSelectionBottomSheet: KeyserverSelectionBottomSheetParams,
  +LinkedDevicesBottomSheet: LinkedDevicesBottomSheetParams,
  +ConnectFarcasterBottomSheet: void,
  +TagFarcasterChannelNavigator: void,
  +CreateMissingSIWEBackupMessage: void,
  +QRAuthNavigator: void,
};

export type NUXTipRouteNames =
  | typeof IntroTipRouteName
  | typeof CommunityDrawerTipRouteName
  | typeof HomeTabTipRouteName
  | typeof MutedTabTipRouteName;

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
  +UserRelationshipTooltipModal: UserRelationshipTooltipModalParams,
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
  +IntroTip: NUXTipsOverlayParams,
  +CommunityDrawerTip: NUXTipsOverlayParams,
  +HomeTabTip: NUXTipsOverlayParams,
  +MutedTabTip: NUXTipsOverlayParams,
  +NUXTipOverlayBackdrop: void,
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
  +PinnedMessagesScreen: PinnedMessagesScreenParams,
  +MessageSearch: MessageSearchParams,
  +ChangeRolesScreen: ChangeRolesScreenParams,
  +ThreadSettingsNotifications: ThreadSettingsNotificationsParams,
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
  +BackupMenu: void,
  +TunnelbrokerMenu: void,
  +KeyserverSelectionList: void,
  +AddKeyserver: void,
  +FarcasterAccountSettings: void,
};

export type CalendarParamList = {
  +CalendarScreen: void,
};

export type CommunityDrawerParamList = { +TabNavigator: void };

export type RegistrationParamList = {
  +CoolOrNerdModeSelection: void,
  +KeyserverSelection: KeyserverSelectionParams,
  +ConnectEthereum: ConnectEthereumParams,
  +ExistingEthereumAccount: ExistingEthereumAccountParams,
  +ConnectFarcaster: ConnectFarcasterParams,
  +CreateSIWEBackupMessage: CreateSIWEBackupMessageParams,
  +UsernameSelection: UsernameSelectionParams,
  +PasswordSelection: PasswordSelectionParams,
  +AvatarSelection: AvatarSelectionParams,
  +EmojiAvatarSelection: EmojiAvatarSelectionParams,
  +RegistrationUserAvatarCameraModal: void,
  +RegistrationTerms: RegistrationTermsParams,
  +AccountDoesNotExist: void,
};

export type InviteLinkParamList = {
  +ViewInviteLinks: ViewInviteLinksScreenParams,
  +ManagePublicLink: ManagePublicLinkScreenParams,
};

export type CommunityCreationParamList = {
  +CommunityConfiguration: void,
};

export type RolesParamList = {
  +CommunityRolesScreen: CommunityRolesScreenParams,
  +CreateRolesScreen: CreateRolesScreenParams,
};

export type TagFarcasterChannelParamList = {
  +TagFarcasterChannel: TagFarcasterChannelParams,
  +TagFarcasterChannelByName: TagFarcasterChannelByNameParams,
};

export type SignInParamList = {
  +QRCodeScreen: void,
  +RestorePromptScreen: void,
  +RestorePasswordAccountScreen: void,
  +RestoreBackupScreen: RestoreBackupScreenParams,
  +RestoreSIWEBackup: RestoreSIWEBackupParams,
};

export type UserProfileBottomSheetParamList = {
  +UserProfileBottomSheet: UserProfileBottomSheetParams,
  +UserProfileAvatarModal: UserProfileAvatarModalParams,
  +UserRelationshipTooltipModal: UserRelationshipTooltipModalParams,
};

export type QRAuthNavigatorParamList = {
  +SecondaryDeviceQRCodeScanner: void,
  +QRAuthNotPrimaryDevice: void,
  +ConnectSecondaryDevice: ConnectSecondaryDeviceParams,
  +SecondaryDeviceConnected: void,
  +SecondaryDeviceNotResponding: void,
};

export type ScreenParamList = {
  ...RootParamList,
  ...OverlayParamList,
  ...TabParamList,
  ...ChatParamList,
  ...ChatTopTabsParamList,
  ...ProfileParamList,
  ...CalendarParamList,
  ...CommunityDrawerParamList,
  ...RegistrationParamList,
  ...InviteLinkParamList,
  ...CommunityCreationParamList,
  ...RolesParamList,
  ...SignInParamList,
  ...UserProfileBottomSheetParamList,
  ...TagFarcasterChannelParamList,
  ...QRAuthNavigatorParamList,
};

export type NavigationRoute<RouteName: string = $Keys<ScreenParamList>> =
  RouteProp<ScreenParamList, RouteName>;

export const accountModals = [
  LoggedOutModalRouteName,
  RegistrationRouteName,
  SignInNavigatorRouteName,
];

export const scrollBlockingModals = [
  ImageModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
  ThreadSettingsMemberTooltipModalRouteName,
  UserRelationshipTooltipModalRouteName,
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
  PinnedMessagesScreenRouteName,
  MessageSearchRouteName,
  EmojiThreadAvatarCreationRouteName,
  CommunityRolesScreenRouteName,
  ThreadSettingsNotificationsRouteName,
];
