// @flow
import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { type BaseNavInfo } from 'lib/types/nav-types.js';
import {
  type ThreadInfo,
  threadInfoValidator,
} from 'lib/types/thread-types.js';
import { tID, tShape } from 'lib/utils/validation-utils.js';

export type NavigationTab = 'calendar' | 'chat' | 'settings';
const navigationTabValidator = t.enums.of(['calendar', 'chat', 'settings']);

export type NavigationSettingsSection = 'account' | 'danger-zone';
const navigationSettingsSectionValidator = t.enums.of([
  'account',
  'danger-zone',
]);

export type NavigationChatMode = 'view' | 'create';
const navigationChatModeValidator = t.enums.of(['view', 'create']);

export type NavInfo = {
  ...$Exact<BaseNavInfo>,
  +tab: NavigationTab,
  +activeChatThreadID: ?string,
  +pendingThread?: ThreadInfo,
  +settingsSection?: NavigationSettingsSection,
  +selectedUserList?: $ReadOnlyArray<string>,
  +chatMode?: NavigationChatMode,
};

export const navInfoValidator: TInterface<NavInfo> = tShape<$Exact<NavInfo>>({
  startDate: t.String,
  endDate: t.String,
  tab: navigationTabValidator,
  activeChatThreadID: t.maybe(tID),
  pendingThread: t.maybe(threadInfoValidator),
  settingsSection: t.maybe(navigationSettingsSectionValidator),
  selectedUserList: t.maybe(t.list(t.String)),
  chatMode: t.maybe(navigationChatModeValidator),
});
