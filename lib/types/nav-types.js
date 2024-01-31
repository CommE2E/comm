// @flow

import t from 'tcomb';
import type { TEnums } from 'tcomb';

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
  | 'danger-zone';
export const webNavigationSettingsSectionValidator: TEnums = t.enums.of([
  'account',
  'friend-list',
  'block-list',
  'keyservers',
  'danger-zone',
]);
export type WebNavigationChatMode = 'view' | 'create';
export const webNavigationChatModeValidator: TEnums = t.enums.of([
  'view',
  'create',
]);
