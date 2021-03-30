// @flow

import type { BaseNavInfo } from 'lib/types/nav-types';
import type { ThreadInfo } from 'lib/types/thread-types';

export type NavInfo = {|
  ...$Exact<BaseNavInfo>,
  +tab: 'calendar' | 'chat',
  +verify: ?string,
  +activeChatThreadID: ?string,
  +pendingThread?: ThreadInfo,
  +sourceMessageID?: string,
|};

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
