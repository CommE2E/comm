// @flow

import type { Orientations } from 'react-native-orientation-locker';
import type { PersistState } from 'redux-persist/src/types';

import type { DraftStore } from 'lib/types/draft-types';
import type { EnabledApps } from 'lib/types/enabled-apps';
import type { EntryStore } from 'lib/types/entry-types';
import type { CalendarFilter } from 'lib/types/filter-types';
import type { LifecycleState } from 'lib/types/lifecycle-state-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { MessageStore } from 'lib/types/message-types';
import type { ReportStore } from 'lib/types/report-types';
import type { ConnectionInfo } from 'lib/types/socket-types';
import type { ThreadStore } from 'lib/types/thread-types';
import type { CurrentUserInfo, UserStore } from 'lib/types/user-types';

import type { NavInfo } from '../navigation/default-state';
import type { NotifPermissionAlertInfo } from '../push/alerts';
import type { DeviceCameraInfo } from '../types/camera';
import type { ConnectivityInfo } from '../types/connectivity';
import type { GlobalThemeInfo } from '../types/themes';
import type { DimensionsInfo } from './dimensions-updater.react';

export type AppState = {
  navInfo: NavInfo,
  currentUserInfo: ?CurrentUserInfo,
  draftStore: DraftStore,
  entryStore: EntryStore,
  threadStore: ThreadStore,
  userStore: UserStore,
  messageStore: MessageStore,
  storeLoaded: boolean,
  updatesCurrentAsOf: number,
  loadingStatuses: { [key: string]: { [idx: number]: LoadingStatus } },
  calendarFilters: $ReadOnlyArray<CalendarFilter>,
  cookie: ?string,
  deviceToken: ?string,
  dataLoaded: boolean,
  urlPrefix: string,
  customServer: ?string,
  threadIDsToNotifIDs: { [threadID: string]: string[] },
  notifPermissionAlertInfo: NotifPermissionAlertInfo,
  connection: ConnectionInfo,
  watchedThreadIDs: $ReadOnlyArray<string>,
  lifecycleState: LifecycleState,
  enabledApps: EnabledApps,
  reportStore: ReportStore,
  nextLocalID: number,
  _persist: ?PersistState,
  sessionID?: void,
  dimensions: DimensionsInfo,
  connectivity: ConnectivityInfo,
  globalThemeInfo: GlobalThemeInfo,
  deviceCameraInfo: DeviceCameraInfo,
  deviceOrientation: Orientations,
  frozen: boolean,
};
