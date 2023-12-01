// @flow
import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { type BaseNavInfo } from 'lib/types/nav-types.js';
import {
  type LegacyThreadInfo,
  legacyThreadInfoValidator,
} from 'lib/types/thread-types.js';
import {
  type AccountUserInfo,
  accountUserInfoValidator,
} from 'lib/types/user-types.js';
import { tID, tShape } from 'lib/utils/validation-utils.js';

export type NavigationTab = 'calendar' | 'chat' | 'settings';
const navigationTabValidator = t.enums.of(['calendar', 'chat', 'settings']);
export type LoginMethod = 'form' | 'qr-code';
const loginMethodValidator = t.enums.of(['form', 'qr-code']);

export type NavigationSettingsSection =
  | 'account'
  | 'keyservers'
  | 'danger-zone';
const navigationSettingsSectionValidator = t.enums.of([
  'account',
  'keyservers',
  'danger-zone',
]);

export type NavigationChatMode = 'view' | 'create';
const navigationChatModeValidator = t.enums.of(['view', 'create']);

export type NavInfo = {
  ...$Exact<BaseNavInfo>,
  +tab: NavigationTab,
  +activeChatThreadID: ?string,
  +pendingThread?: LegacyThreadInfo,
  +settingsSection?: NavigationSettingsSection,
  +selectedUserList?: $ReadOnlyArray<AccountUserInfo>,
  +chatMode?: NavigationChatMode,
  +inviteSecret?: ?string,
  +loginMethod?: LoginMethod,
};

export const navInfoValidator: TInterface<NavInfo> = tShape<$Exact<NavInfo>>({
  startDate: t.String,
  endDate: t.String,
  tab: navigationTabValidator,
  activeChatThreadID: t.maybe(tID),
  pendingThread: t.maybe(legacyThreadInfoValidator),
  settingsSection: t.maybe(navigationSettingsSectionValidator),
  selectedUserList: t.maybe(t.list(accountUserInfoValidator)),
  chatMode: t.maybe(navigationChatModeValidator),
  inviteSecret: t.maybe(t.String),
  loginMethod: t.maybe(loginMethodValidator),
});
