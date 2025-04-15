// @flow

import type { TEnums, TInterface } from 'tcomb';
import t from 'tcomb';

import type { ThreadInfo } from './minimally-encoded-thread-permissions-types.js';
import type { AccountUserInfo } from './user-types.js';
import { accountUserInfoValidator } from './user-types.js';
import { threadInfoValidator } from '../permissions/minimally-encoded-thread-permissions-validators.js';
import { tID, tShape } from '../utils/validation-utils.js';

export type BaseNavInfo = {
  +startDate: string,
  +endDate: string,
  ...
};
export type WebNavigationTab = 'calendar' | 'chat' | 'settings';
export const webNavigationTabValidator: TEnums = t.enums.of([
  'calendar',
  'chat',
  'settings',
]);
export type WebLoginMethod = 'form' | 'qr-code';
export const webLoginMethodValidator: TEnums = t.enums.of(['form', 'qr-code']);
export type WebNavigationSettingsSection =
  | 'account'
  | 'friend-list'
  | 'block-list'
  | 'keyservers'
  | 'build-info';
export const webNavigationSettingsSectionValidator: TEnums = t.enums.of([
  'account',
  'friend-list',
  'block-list',
  'keyservers',
  'build-info',
]);
export type WebNavigationChatMode = 'view' | 'create';
export const webNavigationChatModeValidator: TEnums = t.enums.of([
  'view',
  'create',
]);
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
