// @flow

import type {
  LogOutResult,
  LogInStartingPayload,
  LogInResult,
  RegisterResult,
  DefaultNotificationPayload,
  ClaimUsernameResponse,
} from './account-types.js';
import type {
  ActivityUpdateSuccessPayload,
  QueueActivityUpdatesPayload,
  SetThreadUnreadStatusPayload,
} from './activity-types.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from './avatar-types.js';
import type { CryptoStore } from './crypto-types.js';
import type { VersionResponse, PlatformDetails } from './device-types.js';
import type { ClientDBDraftInfo, DraftStore } from './draft-types.js';
import type { EnabledApps, SupportedApps } from './enabled-apps.js';
import type {
  RawEntryInfo,
  EntryStore,
  SaveEntryPayload,
  CreateEntryPayload,
  DeleteEntryResult,
  RestoreEntryPayload,
  FetchEntryInfosResult,
  CalendarQueryUpdateResult,
  CalendarQueryUpdateStartingPayload,
  CalendarQuery,
} from './entry-types.js';
import type {
  CalendarFilter,
  CalendarThreadFilter,
  SetCalendarDeletedFilterPayload,
} from './filter-types.js';
import type { IntegrityStore } from './integrity-types.js';
import type { KeyserverStore } from './keyserver-types.js';
import type { LifecycleState } from './lifecycle-state-types.js';
import type {
  FetchInviteLinksResponse,
  InviteLink,
  InviteLinksStore,
  InviteLinkVerificationResponse,
  DisableInviteLinkPayload,
} from './link-types.js';
import type { LoadingStatus, LoadingInfo } from './loading-types.js';
import type { UpdateMultimediaMessageMediaPayload } from './media-types.js';
import type { MessageReportCreationResult } from './message-report-types.js';
import type {
  MessageStore,
  RawMultimediaMessageInfo,
  FetchMessageInfosPayload,
  SendMessagePayload,
  EditMessagePayload,
  SaveMessagesPayload,
  NewMessagesPayload,
  MessageStorePrunePayload,
  LocallyComposedMessageInfo,
  ClientDBMessageInfo,
  SimpleMessagesPayload,
  ClientDBThreadMessageInfo,
  FetchPinnedMessagesResult,
  SearchMessagesResponse,
} from './message-types.js';
import type { RawReactionMessageInfo } from './messages/reaction.js';
import type { RawTextMessageInfo } from './messages/text.js';
import type { BaseNavInfo } from './nav-types.js';
import {
  type ForcePolicyAcknowledgmentPayload,
  type PolicyAcknowledgmentPayload,
  type UserPolicies,
} from './policy-types.js';
import type { RelationshipErrors } from './relationship-types.js';
import type {
  EnabledReports,
  ClearDeliveredReportsPayload,
  QueueReportsPayload,
  ReportStore,
  ClientReportCreationRequest,
} from './report-types.js';
import type {
  ProcessServerRequestAction,
  GetOlmSessionInitializationDataResponse,
} from './request-types.js';
import type {
  UserSearchResult,
  ExactUserSearchResult,
} from './search-types.js';
import type { SetSessionPayload } from './session-types.js';
import type {
  StateSyncFullActionPayload,
  StateSyncIncrementalActionPayload,
  UpdateConnectionStatusPayload,
  SetLateResponsePayload,
  UpdateDisconnectedBarPayload,
} from './socket-types.js';
import type { SubscriptionUpdateResult } from './subscription-types.js';
import type { ThreadActivityStore } from './thread-activity-types.js';
import type {
  ThreadStore,
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  NewThreadResult,
  ThreadJoinPayload,
  ToggleMessagePinResult,
  RoleModificationPayload,
  RoleDeletionPayload,
} from './thread-types.js';
import type { ClientUpdatesResultWithUserInfos } from './update-types.js';
import type { CurrentUserInfo, UserStore } from './user-types.js';
import type { Shape } from '../types/core.js';
import type { NotifPermissionAlertInfo } from '../utils/push-alerts.js';

export type BaseAppState<NavInfo: BaseNavInfo = BaseNavInfo> = {
  +navInfo: NavInfo,
  +currentUserInfo: ?CurrentUserInfo,
  +draftStore: DraftStore,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userStore: UserStore,
  +messageStore: MessageStore,
  +loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
  +notifPermissionAlertInfo: NotifPermissionAlertInfo,
  +actualizedCalendarQuery: CalendarQuery,
  +watchedThreadIDs: $ReadOnlyArray<string>,
  +lifecycleState: LifecycleState,
  +enabledApps: EnabledApps,
  +reportStore: ReportStore,
  +nextLocalID: number,
  +dataLoaded: boolean,
  +userPolicies: UserPolicies,
  +deviceToken: ?string,
  +commServicesAccessToken: ?string,
  +inviteLinksStore: InviteLinksStore,
  +keyserverStore: KeyserverStore,
  +threadActivityStore: ThreadActivityStore,
  +integrityStore: IntegrityStore,
  ...
};

export type NativeAppState = BaseAppState<>;
export type WebAppState = BaseAppState<> & {
  +cryptoStore: CryptoStore,
  +pushApiPublicKey: ?string,
  ...
};
export type AppState = NativeAppState | WebAppState;

export type BaseAction =
  | {
      +type: '@@redux/INIT',
      +payload?: void,
    }
  | {
      +type: 'FETCH_ENTRIES_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_ENTRIES_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_ENTRIES_SUCCESS',
      +payload: FetchEntryInfosResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LOG_OUT_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LOG_OUT_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LOG_OUT_SUCCESS',
      +payload: LogOutResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CLAIM_USERNAME_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CLAIM_USERNAME_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CLAIM_USERNAME_SUCCESS',
      +payload: ClaimUsernameResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_ACCOUNT_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_ACCOUNT_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_ACCOUNT_SUCCESS',
      +payload: LogOutResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CREATE_LOCAL_ENTRY',
      +payload: RawEntryInfo,
    }
  | {
      +type: 'CREATE_ENTRY_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CREATE_ENTRY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CREATE_ENTRY_SUCCESS',
      +payload: CreateEntryPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SAVE_ENTRY_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SAVE_ENTRY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SAVE_ENTRY_SUCCESS',
      +payload: SaveEntryPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CONCURRENT_MODIFICATION_RESET',
      +payload: {
        +id: string,
        +dbText: string,
      },
    }
  | {
      +type: 'DELETE_ENTRY_STARTED',
      +loadingInfo: LoadingInfo,
      +payload: {
        +localID: ?string,
        +serverID: ?string,
      },
    }
  | {
      +type: 'DELETE_ENTRY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_ENTRY_SUCCESS',
      +payload: ?DeleteEntryResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LOG_IN_STARTED',
      +loadingInfo: LoadingInfo,
      +payload: LogInStartingPayload,
    }
  | {
      +type: 'LOG_IN_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LOG_IN_SUCCESS',
      +payload: LogInResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REGISTER_STARTED',
      +loadingInfo: LoadingInfo,
      +payload: LogInStartingPayload,
    }
  | {
      +type: 'REGISTER_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REGISTER_SUCCESS',
      +payload: RegisterResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_USER_PASSWORD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_USER_PASSWORD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_USER_PASSWORD_SUCCESS',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_SETTINGS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_SETTINGS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_SETTINGS_SUCCESS',
      +payload: ChangeThreadSettingsPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_THREAD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_THREAD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_THREAD_SUCCESS',
      +payload: LeaveThreadPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'NEW_THREAD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'NEW_THREAD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'NEW_THREAD_SUCCESS',
      +payload: NewThreadResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REMOVE_USERS_FROM_THREAD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REMOVE_USERS_FROM_THREAD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REMOVE_USERS_FROM_THREAD_SUCCESS',
      +payload: ChangeThreadSettingsPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_MEMBER_ROLES_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_MEMBER_ROLES_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CHANGE_THREAD_MEMBER_ROLES_SUCCESS',
      +payload: ChangeThreadSettingsPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_REVISIONS_FOR_ENTRY_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_REVISIONS_FOR_ENTRY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_REVISIONS_FOR_ENTRY_SUCCESS',
      +payload: {
        +entryID: string,
        +text: string,
        +deleted: boolean,
      },
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'RESTORE_ENTRY_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'RESTORE_ENTRY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'RESTORE_ENTRY_SUCCESS',
      +payload: RestoreEntryPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'JOIN_THREAD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'JOIN_THREAD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'JOIN_THREAD_SUCCESS',
      +payload: ThreadJoinPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LEAVE_THREAD_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LEAVE_THREAD_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'LEAVE_THREAD_SUCCESS',
      +payload: LeaveThreadPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_NEW_SESSION',
      +payload: SetSessionPayload,
    }
  | {
      +type: 'persist/REHYDRATE',
      +payload: ?BaseAppState<>,
    }
  | {
      +type: 'FETCH_MESSAGES_BEFORE_CURSOR_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_MESSAGES_BEFORE_CURSOR_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS',
      +payload: FetchMessageInfosPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_MOST_RECENT_MESSAGES_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_MOST_RECENT_MESSAGES_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_MOST_RECENT_MESSAGES_SUCCESS',
      +payload: FetchMessageInfosPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_SINGLE_MOST_RECENT_MESSAGES_FROM_THREADS_SUCCESS',
      +payload: SimpleMessagesPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_TEXT_MESSAGE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload: RawTextMessageInfo,
    }
  | {
      +type: 'SEND_TEXT_MESSAGE_FAILED',
      +error: true,
      +payload: Error & {
        +localID: string,
        +threadID: string,
      },
      +loadingInfo?: LoadingInfo,
    }
  | {
      +type: 'SEND_TEXT_MESSAGE_SUCCESS',
      +payload: SendMessagePayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_MULTIMEDIA_MESSAGE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload: RawMultimediaMessageInfo,
    }
  | {
      +type: 'SEND_MULTIMEDIA_MESSAGE_FAILED',
      +error: true,
      +payload: Error & {
        +localID: string,
        +threadID: string,
      },
      +loadingInfo?: LoadingInfo,
    }
  | {
      +type: 'SEND_MULTIMEDIA_MESSAGE_SUCCESS',
      +payload: SendMessagePayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REACTION_MESSAGE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload: RawReactionMessageInfo,
    }
  | {
      +type: 'SEND_REACTION_MESSAGE_FAILED',
      +error: true,
      +payload: Error & {
        +localID: string,
        +threadID: string,
        +targetMessageID: string,
        +reaction: string,
        +action: string,
      },
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REACTION_MESSAGE_SUCCESS',
      +payload: SendMessagePayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEARCH_USERS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEARCH_USERS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEARCH_USERS_SUCCESS',
      +payload: UserSearchResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'EXACT_SEARCH_USER_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'EXACT_SEARCH_USER_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'EXACT_SEARCH_USER_SUCCESS',
      +payload: ExactUserSearchResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_DRAFT',
      +payload: {
        +key: string,
        +text: string,
      },
    }
  | {
      +type: 'MOVE_DRAFT',
      +payload: {
        +oldKey: string,
        +newKey: string,
      },
    }
  | {
      +type: 'SET_CLIENT_DB_STORE',
      +payload: {
        +currentUserID: ?string,
        +drafts: $ReadOnlyArray<ClientDBDraftInfo>,
        +messages: ?$ReadOnlyArray<ClientDBMessageInfo>,
        +threadStore: ?ThreadStore,
        +messageStoreThreads: ?$ReadOnlyArray<ClientDBThreadMessageInfo>,
        +reports: ?$ReadOnlyArray<ClientReportCreationRequest>,
      },
    }
  | {
      +type: 'UPDATE_ACTIVITY_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_ACTIVITY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_ACTIVITY_SUCCESS',
      +payload: ActivityUpdateSuccessPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_DEVICE_TOKEN_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_DEVICE_TOKEN_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_DEVICE_TOKEN_SUCCESS',
      +payload: ?string,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORT_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORT_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORT_SUCCESS',
      +payload?: ClearDeliveredReportsPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORTS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORTS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_REPORTS_SUCCESS',
      +payload?: ClearDeliveredReportsPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'QUEUE_REPORTS',
      +payload: QueueReportsPayload,
    }
  | {
      +type: 'SET_URL_PREFIX',
      +payload: string,
    }
  | {
      +type: 'SAVE_MESSAGES',
      +payload: SaveMessagesPayload,
    }
  | {
      +type: 'UPDATE_CALENDAR_THREAD_FILTER',
      +payload: CalendarThreadFilter,
    }
  | {
      +type: 'CLEAR_CALENDAR_THREAD_FILTER',
      +payload?: void,
    }
  | {
      +type: 'SET_CALENDAR_DELETED_FILTER',
      +payload: SetCalendarDeletedFilterPayload,
    }
  | {
      +type: 'UPDATE_SUBSCRIPTION_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_SUBSCRIPTION_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_SUBSCRIPTION_SUCCESS',
      +payload: SubscriptionUpdateResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_CALENDAR_QUERY_STARTED',
      +loadingInfo: LoadingInfo,
      +payload?: CalendarQueryUpdateStartingPayload,
    }
  | {
      +type: 'UPDATE_CALENDAR_QUERY_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_CALENDAR_QUERY_SUCCESS',
      +payload: CalendarQueryUpdateResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FULL_STATE_SYNC',
      +payload: StateSyncFullActionPayload,
    }
  | {
      +type: 'INCREMENTAL_STATE_SYNC',
      +payload: StateSyncIncrementalActionPayload,
    }
  | ProcessServerRequestAction
  | {
      +type: 'UPDATE_CONNECTION_STATUS',
      +payload: UpdateConnectionStatusPayload,
    }
  | {
      +type: 'QUEUE_ACTIVITY_UPDATES',
      +payload: QueueActivityUpdatesPayload,
    }
  | {
      +type: 'UNSUPERVISED_BACKGROUND',
      +payload?: void,
    }
  | {
      +type: 'UPDATE_LIFECYCLE_STATE',
      +payload: LifecycleState,
    }
  | {
      +type: 'ENABLE_APP',
      +payload: SupportedApps,
    }
  | {
      +type: 'DISABLE_APP',
      +payload: SupportedApps,
    }
  | {
      +type: 'UPDATE_REPORTS_ENABLED',
      +payload: Shape<EnabledReports>,
    }
  | {
      +type: 'PROCESS_UPDATES',
      +payload: ClientUpdatesResultWithUserInfos,
    }
  | {
      +type: 'PROCESS_MESSAGES',
      +payload: NewMessagesPayload,
    }
  | {
      +type: 'MESSAGE_STORE_PRUNE',
      +payload: MessageStorePrunePayload,
    }
  | {
      +type: 'SET_LATE_RESPONSE',
      +payload: SetLateResponsePayload,
    }
  | {
      +type: 'UPDATE_DISCONNECTED_BAR',
      +payload: UpdateDisconnectedBarPayload,
    }
  | {
      +type: 'REQUEST_ACCESS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REQUEST_ACCESS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'REQUEST_ACCESS_SUCCESS',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_MULTIMEDIA_MESSAGE_MEDIA',
      +payload: UpdateMultimediaMessageMediaPayload,
    }
  | {
      +type: 'CREATE_LOCAL_MESSAGE',
      +payload: LocallyComposedMessageInfo,
    }
  | {
      +type: 'UPDATE_RELATIONSHIPS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_RELATIONSHIPS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_RELATIONSHIPS_SUCCESS',
      +payload: RelationshipErrors,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_THREAD_UNREAD_STATUS_STARTED',
      +payload: {
        +threadID: string,
        +unread: boolean,
      },
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_THREAD_UNREAD_STATUS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_THREAD_UNREAD_STATUS_SUCCESS',
      +payload: SetThreadUnreadStatusPayload,
    }
  | {
      +type: 'SET_USER_SETTINGS_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_USER_SETTINGS_SUCCESS',
      +payload: DefaultNotificationPayload,
    }
  | {
      +type: 'SET_USER_SETTINGS_FAILED',
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_MESSAGE_REPORT_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_MESSAGE_REPORT_SUCCESS',
      +payload: MessageReportCreationResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_MESSAGE_REPORT_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FORCE_POLICY_ACKNOWLEDGMENT',
      +payload: ForcePolicyAcknowledgmentPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'POLICY_ACKNOWLEDGMENT_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'POLICY_ACKNOWLEDGMENT_SUCCESS',
      +payload: PolicyAcknowledgmentPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'POLICY_ACKNOWLEDGMENT_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_SIWE_NONCE_STARTED',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_SIWE_NONCE_SUCCESS',
      +payload?: void,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_SIWE_NONCE_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SIWE_AUTH_STARTED',
      +payload: LogInStartingPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SIWE_AUTH_SUCCESS',
      +payload: LogInResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SIWE_AUTH_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'RECORD_NOTIF_PERMISSION_ALERT',
      +payload: { +time: number },
    }
  | {
      +type: 'UPDATE_USER_AVATAR_STARTED',
      +payload: UpdateUserAvatarRequest,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_USER_AVATAR_SUCCESS',
      +payload: UpdateUserAvatarResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_USER_AVATAR_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_EDIT_MESSAGE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'SEND_EDIT_MESSAGE_SUCCESS',
      +payload: EditMessagePayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEND_EDIT_MESSAGE_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'TOGGLE_MESSAGE_PIN_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'TOGGLE_MESSAGE_PIN_SUCCESS',
      +payload: ToggleMessagePinResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'TOGGLE_MESSAGE_PIN_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_PINNED_MESSAGES_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'FETCH_PINNED_MESSAGES_SUCCESS',
      +payload: FetchPinnedMessagesResult,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_PINNED_MESSAGES_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'VERIFY_INVITE_LINK_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'VERIFY_INVITE_LINK_SUCCESS',
      +payload: InviteLinkVerificationResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'VERIFY_INVITE_LINK_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_PRIMARY_INVITE_LINKS_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'FETCH_PRIMARY_INVITE_LINKS_SUCCESS',
      +payload: FetchInviteLinksResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'FETCH_PRIMARY_INVITE_LINKS_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_CALENDAR_COMMUNITY_FILTER',
      +payload: string,
    }
  | {
      +type: 'CLEAR_CALENDAR_COMMUNITY_FILTER',
      +payload: void,
    }
  | {
      +type: 'UPDATE_CHAT_COMMUNITY_FILTER',
      +payload: string,
    }
  | {
      +type: 'CLEAR_CHAT_COMMUNITY_FILTER',
      +payload: void,
    }
  | {
      +type: 'SEARCH_MESSAGES_STARTED',
      +payload: void,
      +loadingInfo?: LoadingInfo,
    }
  | {
      +type: 'SEARCH_MESSAGES_SUCCESS',
      +payload: SearchMessagesResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SEARCH_MESSAGES_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CREATE_OR_UPDATE_PUBLIC_LINK_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'CREATE_OR_UPDATE_PUBLIC_LINK_SUCCESS',
      +payload: InviteLink,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'CREATE_OR_UPDATE_PUBLIC_LINK_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DISABLE_INVITE_LINK_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'DISABLE_INVITE_LINK_SUCCESS',
      +payload: DisableInviteLinkPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DISABLE_INVITE_LINK_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_OLM_SESSION_INITIALIZATION_DATA_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'GET_OLM_SESSION_INITIALIZATION_DATA_SUCCESS',
      +payload: GetOlmSessionInitializationDataResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_OLM_SESSION_INITIALIZATION_DATA_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_DATA_LOADED',
      +payload: {
        +dataLoaded: boolean,
      },
    }
  | {
      +type: 'GET_VERSION_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'GET_VERSION_SUCCESS',
      +payload: VersionResponse,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'GET_VERSION_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'UPDATE_LAST_COMMUNICATED_PLATFORM_DETAILS',
      +payload: PlatformDetails,
    }
  | { +type: 'RESET_USER_STATE', +payload?: void }
  | {
      +type: 'MODIFY_COMMUNITY_ROLE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'MODIFY_COMMUNITY_ROLE_SUCCESS',
      +payload: RoleModificationPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'MODIFY_COMMUNITY_ROLE_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_COMMUNITY_ROLE_STARTED',
      +loadingInfo?: LoadingInfo,
      +payload?: void,
    }
  | {
      +type: 'DELETE_COMMUNITY_ROLE_SUCCESS',
      +payload: RoleDeletionPayload,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'DELETE_COMMUNITY_ROLE_FAILED',
      +error: true,
      +payload: Error,
      +loadingInfo: LoadingInfo,
    }
  | {
      +type: 'SET_ACCESS_TOKEN',
      +payload: string,
    }
  | {
      +type: 'UPDATE_THREAD_LAST_NAVIGATED',
      +payload: { +threadID: string, +time: number },
    }
  | {
      +type: 'UPDATE_INTEGRITY_STORE',
      +payload: {
        +threadIDsToHash?: $ReadOnlyArray<string>,
        +threadHashingStatus?: 'starting' | 'running' | 'completed',
      },
    };

export type ActionPayload = ?(Object | Array<*> | $ReadOnlyArray<*> | string);
export type SuperAction = {
  type: string,
  payload?: ActionPayload,
  loadingInfo?: LoadingInfo,
  error?: boolean,
};
type ThunkedAction = (dispatch: Dispatch) => void;
export type PromisedAction = (dispatch: Dispatch) => Promise<void>;
export type Dispatch = ((promisedAction: PromisedAction) => Promise<void>) &
  ((thunkedAction: ThunkedAction) => void) &
  ((action: SuperAction) => boolean);

// This is lifted from redux-persist/lib/constants.js
// I don't want to add redux-persist to the web/server bundles...
// import { REHYDRATE } from 'redux-persist';
export const rehydrateActionType = 'persist/REHYDRATE';
