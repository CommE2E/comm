// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';

export type NavigationTab = 'calendar' | 'chat' | 'apps' | 'settings';

export type NavigationSettingsSection = 'account' | 'danger-zone';

export type NavInfo = {
  ...$Exact<BaseNavInfo>,
  +tab: NavigationTab,
  +activeChatThreadID: ?string,
  +pendingThread?: ThreadInfo,
  +settingsSection?: NavigationSettingsSection,
};

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
