// @flow

import type { Orientations } from 'react-native-orientation-locker';
import type { PersistState } from 'redux-persist/es/types.js';

import type { AlertStore } from 'lib/types/alert-types.js';
import type { AuxUserStore } from 'lib/types/aux-user-types.js';
import type { BackupStore } from 'lib/types/backup-types.js';
import type { CommunityStore } from 'lib/types/community-types.js';
import type { DBOpsStore } from 'lib/types/db-ops-types';
import type { QueuedDMOperations } from 'lib/types/dm-ops';
import type { DraftStore } from 'lib/types/draft-types.js';
import type { EnabledApps } from 'lib/types/enabled-apps.js';
import type { EntryStore } from 'lib/types/entry-types.js';
import type { CalendarFilter } from 'lib/types/filter-types.js';
import type { HolderStore } from 'lib/types/holder-types.js';
import type { IntegrityStore } from 'lib/types/integrity-types.js';
import type { KeyserverStore } from 'lib/types/keyserver-types.js';
import type { LifecycleState } from 'lib/types/lifecycle-state-types.js';
import type { InviteLinksStore } from 'lib/types/link-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { MessageStore } from 'lib/types/message-types.js';
import type { UserPolicies } from 'lib/types/policy-types.js';
import type { ReportStore } from 'lib/types/report-types.js';
import type { SyncedMetadataStore } from 'lib/types/synced-metadata-types.js';
import type { GlobalThemeInfo } from 'lib/types/theme-types.js';
import type { ThreadActivityStore } from 'lib/types/thread-activity-types';
import type { ThreadStore } from 'lib/types/thread-types.js';
import type { TunnelbrokerDeviceToken } from 'lib/types/tunnelbroker-device-token-types';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types.js';

import type { DimensionsInfo } from './dimensions-updater.react.js';
import type { NavInfo } from '../navigation/default-state.js';
import type { DeviceCameraInfo } from '../types/camera.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { LocalSettings } from '../types/local-settings-types.js';

const nonUserSpecificFieldsNative = [
  'initialStateLoaded',
  'loadingStatuses',
  'customServer',
  'lifecycleState',
  'dimensions',
  'connectivity',
  'deviceCameraInfo',
  'deviceOrientation',
  'frozen',
  'keyserverStore',
  '_persist',
  'commServicesAccessToken',
];

export type AppState = {
  +navInfo: NavInfo,
  +currentUserInfo: ?CurrentUserInfo,
  +draftStore: DraftStore,
  +entryStore: EntryStore,
  +threadStore: ThreadStore,
  +userStore: UserStore,
  +messageStore: MessageStore,
  +initialStateLoaded: boolean,
  +loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
  +dataLoaded: boolean,
  +customServer: ?string,
  +alertStore: AlertStore,
  +watchedThreadIDs: $ReadOnlyArray<string>,
  +lifecycleState: LifecycleState,
  +enabledApps: EnabledApps,
  +reportStore: ReportStore,
  +_persist: ?PersistState,
  +dimensions: DimensionsInfo,
  +connectivity: ConnectivityInfo,
  +globalThemeInfo: GlobalThemeInfo,
  +deviceCameraInfo: DeviceCameraInfo,
  +deviceOrientation: Orientations,
  +frozen: boolean,
  +userPolicies: UserPolicies,
  +commServicesAccessToken: ?string,
  +inviteLinksStore: InviteLinksStore,
  +keyserverStore: KeyserverStore,
  +threadActivityStore: ThreadActivityStore,
  +localSettings: LocalSettings,
  +integrityStore: IntegrityStore,
  +communityStore: CommunityStore,
  +dbOpsStore: DBOpsStore,
  +syncedMetadataStore: SyncedMetadataStore,
  +auxUserStore: AuxUserStore,
  +tunnelbrokerDeviceToken: TunnelbrokerDeviceToken,
  +queuedDMOperations: QueuedDMOperations,
  +holderStore: HolderStore,
  +backupStore: BackupStore,
};

export { nonUserSpecificFieldsNative };
