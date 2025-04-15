// @flow

import t, { type TInterface } from 'tcomb';

import {
  idSchemaRegex,
  tID,
  tShape,
  pendingThreadIDRegex,
  tUserID,
} from './validation-utils.js';
import { inviteSecretRegexString } from '../shared/invite-links-constants.js';

type MutableURLInfo = {
  year?: number,
  month?: number, // 1-indexed
  verify?: string,
  calendar?: boolean,
  chat?: boolean,
  thread?: string,
  settings?:
    | 'account'
    | 'friend-list'
    | 'block-list'
    | 'keyservers'
    | 'build-info',
  threadCreation?: boolean,
  selectedUserList?: $ReadOnlyArray<string>,
  inviteSecret?: string,
  qrCode?: boolean,
  ...
};

export type URLInfo = $ReadOnly<MutableURLInfo>;

export const urlInfoValidator: TInterface<URLInfo> = tShape<URLInfo>({
  year: t.maybe(t.Number),
  month: t.maybe(t.Number),
  verify: t.maybe(t.String),
  calendar: t.maybe(t.Boolean),
  chat: t.maybe(t.Boolean),
  thread: t.maybe(tID),
  settings: t.maybe(
    t.enums.of([
      'account',
      'friend-list',
      'block-list',
      'keyservers',
      'build-info',
    ]),
  ),
  threadCreation: t.maybe(t.Boolean),
  selectedUserList: t.maybe(t.list(tUserID)),
  inviteSecret: t.maybe(t.String),
  qrCode: t.maybe(t.Boolean),
});

// We use groups to capture parts of the URL and any changes
// to regexes must be reflected in infoFromURL.
const yearRegex = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i');
const monthRegex = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i');
const threadRegex = new RegExp(`(/|^)thread/(${idSchemaRegex})(/|$)`, 'i');
const verifyRegex = new RegExp('(/|^)verify/([a-f0-9]+)(/|$)', 'i');
const calendarRegex = new RegExp('(/|^)calendar(/|$)', 'i');
const chatRegex = new RegExp('(/|^)chat(/|$)', 'i');
const accountSettingsRegex = new RegExp('(/|^)settings/account(/|$)', 'i');
const friendListRegex = new RegExp('(/|^)settings/friend-list(/|$)', 'i');
const blockListRegex = new RegExp('(/|^)settings/block-list(/|$)', 'i');
const keyserversRegex = new RegExp('(/|^)settings/keyservers(/|$)', 'i');
const buildInfoRegex = new RegExp('(/|^)settings/build-info(/|$)', 'i');
const threadPendingRegex = new RegExp(
  `(/|^)thread/(${pendingThreadIDRegex})(/|$)`,
  'i',
);
const threadCreationRegex = new RegExp(
  '(/|^)thread/new(/([0-9]+([+][0-9]+)*))?(/|$)',
  'i',
);
const inviteLinkRegex = new RegExp(
  `(/|^)handle/invite/(${inviteSecretRegexString})(/|$)`,
  'i',
);
const qrCodeLoginRegex = new RegExp('(/|^)qr-code(/|$)', 'i');

function infoFromURL(url: string): URLInfo {
  const yearMatches = yearRegex.exec(url);
  const monthMatches = monthRegex.exec(url);
  const threadMatches = threadRegex.exec(url);
  const verifyMatches = verifyRegex.exec(url);
  const calendarTest = calendarRegex.test(url);
  const chatTest = chatRegex.test(url);
  const accountSettingsTest = accountSettingsRegex.test(url);
  const friendListTest = friendListRegex.test(url);
  const blockListTest = blockListRegex.test(url);
  const keyserversSettingsTest = keyserversRegex.test(url);
  const buildInfoTest = buildInfoRegex.test(url);
  const threadPendingMatches = threadPendingRegex.exec(url);
  const threadCreateMatches = threadCreationRegex.exec(url);
  const inviteLinkMatches = inviteLinkRegex.exec(url);
  const qrCodeLoginMatches = qrCodeLoginRegex.exec(url);

  const returnObj: MutableURLInfo = {};
  if (yearMatches) {
    returnObj.year = parseInt(yearMatches[2], 10);
  }
  if (monthMatches) {
    const month = parseInt(monthMatches[2], 10);
    if (month < 1 || month > 12) {
      throw new Error('invalid_month');
    }
    returnObj.month = month;
  }
  if (threadMatches) {
    returnObj.thread = threadMatches[2];
  }
  if (threadPendingMatches) {
    returnObj.thread = threadPendingMatches[2];
  }
  if (threadCreateMatches) {
    returnObj.threadCreation = true;
    returnObj.selectedUserList = threadCreateMatches[3]?.split('+') ?? [];
  }
  if (verifyMatches) {
    returnObj.verify = verifyMatches[2];
  }
  if (inviteLinkMatches) {
    returnObj.inviteSecret = inviteLinkMatches[2];
  }
  if (calendarTest) {
    returnObj.calendar = true;
  } else if (chatTest) {
    returnObj.chat = true;
  } else if (accountSettingsTest) {
    returnObj.settings = 'account';
  } else if (friendListTest) {
    returnObj.settings = 'friend-list';
  } else if (blockListTest) {
    returnObj.settings = 'block-list';
  } else if (keyserversSettingsTest) {
    returnObj.settings = 'keyservers';
  } else if (buildInfoTest) {
    returnObj.settings = 'build-info';
  } else if (qrCodeLoginMatches) {
    returnObj.qrCode = true;
  }
  return returnObj;
}

const setURLPrefix = 'SET_URL_PREFIX';

export type URLPathParams = { +[name: string]: string };

function replacePathParams(path: string, params: URLPathParams = {}): string {
  for (const name in params) {
    path = path.replace(`:${name}`, params[name]);
  }
  return path;
}

export { infoFromURL, setURLPrefix, replacePathParams };
