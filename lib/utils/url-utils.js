// @flow

import { pendingThreadIDRegex } from '../shared/thread-utils.js';

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
  ...
};

// We use groups to capture parts of the URL and any changes
// to regexes must be reflected in infoFromURL.
const yearRegex = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i');
const monthRegex = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i');
const threadRegex = new RegExp('(/|^)thread/([0-9]+)(/|$)', 'i');
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
  if (calendarTest) {
    returnObj.calendar = true;
  } else if (chatTest) {
    returnObj.chat = true;
  } else if (accountSettingsTest) {
    returnObj.settings = 'account';
  } else if (dangerZoneTest) {
    returnObj.settings = 'danger-zone';
  }
  return returnObj;
}

const setURLPrefix = 'SET_URL_PREFIX';

export { infoFromURL, setURLPrefix };
