// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';

export type NavInfo = {
  ...$Exact<BaseNavInfo>,
  +tab: 'calendar' | 'chat' | 'apps',
  +activeChatThreadID: ?string,
  +pendingThread?: ThreadInfo,
};

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
