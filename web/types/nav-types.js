// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { threadInfoValidator } from 'lib/permissions/minimally-encoded-thread-permissions-validators.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { type BaseNavInfo } from 'lib/types/nav-types.js';
import {
  type AccountUserInfo,
  accountUserInfoValidator,
} from 'lib/types/user-types.js';
import { tID, tShape } from 'lib/utils/validation-utils.js';

export type WebNavigationTab = 'calendar' | 'chat' | 'settings';
const webNavigationTabValidator = t.enums.of(['calendar', 'chat', 'settings']);
export type WebLoginMethod = 'form' | 'qr-code';
const webLoginMethodValidator = t.enums.of(['form', 'qr-code']);

export type WebNavigationSettingsSection =
  | 'account'
  | 'friend-list'
  | 'block-list'
  | 'keyservers'
  | 'danger-zone';
const webNavigationSettingsSectionValidator = t.enums.of([
  'account',
  'friend-list',
  'block-list',
  'keyservers',
  'danger-zone',
]);

export type WebNavigationChatMode = 'view' | 'create';
const webNavigationChatModeValidator = t.enums.of(['view', 'create']);

export type WebNavInfo = {
  ...$Exact<BaseNavInfo>,
  +tab: WebNavigationTab,
  +activeChatThreadID: ?string,
  +pendingThread?: ThreadInfo,
  +settingsSection?: WebNavigationSettingsSection,
  +selectedUserList?: $ReadOnlyArray<AccountUserInfo>,
  +chatMode?: WebNavigationChatMode,
  +inviteSecret?: ?string,
  +loginMethod?: WebLoginMethod,
};

export const webNavInfoValidator: TInterface<WebNavInfo> = tShape<
  $Exact<WebNavInfo>,
>({
  startDate: t.String,
  endDate: t.String,
  tab: webNavigationTabValidator,
  activeChatThreadID: t.maybe(tID),
  pendingThread: t.maybe(threadInfoValidator),
  settingsSection: t.maybe(webNavigationSettingsSectionValidator),
  selectedUserList: t.maybe(t.list(accountUserInfoValidator)),
  chatMode: t.maybe(webNavigationChatModeValidator),
  inviteSecret: t.maybe(t.String),
  loginMethod: t.maybe(webLoginMethodValidator),
});
