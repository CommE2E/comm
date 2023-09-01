// @flow

import t, { type TInterface } from 'tcomb';

import {
  idSchemaRegex,
  tID,
  tShape,
  pendingThreadIDRegex,
} from './validation-utils.js';

export type URLInfo = {
  +year?: number,
  +month?: number, // 1-indexed
  +verify?: string,
  +calendar?: boolean,
  +chat?: boolean,
  +thread?: string,
  +settings?: 'account' | 'danger-zone',
  +threadCreation?: boolean,
  +selectedUserList?: $ReadOnlyArray<string>,
  +inviteSecret?: string,
  +qrCode?: boolean,
  ...
};

export const urlInfoValidator: TInterface<URLInfo> = tShape<URLInfo>({
  year: t.maybe(t.Number),
  month: t.maybe(t.Number),
  verify: t.maybe(t.String),
  calendar: t.maybe(t.Boolean),
  chat: t.maybe(t.Boolean),
  thread: t.maybe(tID),
  settings: t.maybe(t.enums.of(['account', 'danger-zone'])),
  threadCreation: t.maybe(t.Boolean),
  selectedUserList: t.maybe(t.list(t.String)),
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
const dangerZoneRegex = new RegExp('(/|^)settings/danger-zone(/|$)', 'i');
const threadPendingRegex = new RegExp(
  `(/|^)thread/(${pendingThreadIDRegex})(/|$)`,
  'i',
);
const threadCreationRegex = new RegExp(
  '(/|^)thread/new(/([0-9]+([+][0-9]+)*))?(/|$)',
  'i',
);
const inviteLinkRegex = new RegExp(
  '(/|^)handle/invite/([a-zA-Z0-9]+)(/|$)',
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
  const dangerZoneTest = dangerZoneRegex.test(url);
  const threadPendingMatches = threadPendingRegex.exec(url);
  const threadCreateMatches = threadCreationRegex.exec(url);
  const inviteLinkMatches = inviteLinkRegex.exec(url);
  const qrCodeLoginMatches = qrCodeLoginRegex.exec(url);

  const returnObj = {};
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
  } else if (dangerZoneTest) {
    returnObj.settings = 'danger-zone';
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
