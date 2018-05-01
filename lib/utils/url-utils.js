// @flow

import invariant from 'invariant';

export type URLInfo = {
  year?: number,
  month?: number, // 1-indexed
  home?: bool,
  threadID?: string,
  verify?: string,
  calendar?: bool,
  chat?: bool,
};

const yearRegex = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i');
const monthRegex = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i');
const threadRegex = new RegExp('(/|^)thread/([0-9]+)(/|$)', 'i');
const verifyRegex = new RegExp('(/|^)verify/([a-f0-9]+)(/|$)', 'i');
const homeRegex = new RegExp('(/|^)home(/|$)', 'i');
const calendarRegex = new RegExp('(/|^)calendar(/|$)', 'i');
const chatRegex = new RegExp('(/|^)chat(/|$)', 'i');

function infoFromURL(url: string): URLInfo {
  const yearMatches = yearRegex.exec(url);
  const monthMatches = monthRegex.exec(url);
  const threadMatches = threadRegex.exec(url);
  const verifyMatches = verifyRegex.exec(url);
  const homeTest = homeRegex.test(url);
  const calendarTest = calendarRegex.test(url);
  const chatTest = chatRegex.test(url);
  invariant(
    !homeTest || !threadMatches,
    'home and thread should never be set at the same time',
  );
  const returnObj = {};
  if (yearMatches) {
    returnObj.year = parseInt(yearMatches[2]);
  }
  if (monthMatches) {
    const month = parseInt(monthMatches[2]);
    if (month < 1 || month > 12) {
      throw new Error("invalid_month");
    }
    returnObj.month = month;
  }
  if (threadMatches) {
    returnObj.threadID = threadMatches[2];
  }
  if (verifyMatches) {
    returnObj.verify = verifyMatches[2];
  }
  if (homeTest) {
    returnObj.home = true;
  }
  if (calendarTest) {
    returnObj.calendar = true;
  }
  if (chatTest) {
    returnObj.chat = true;
  }
  return returnObj;
}

const setURLPrefix = "SET_URL_PREFIX";

export {
  infoFromURL,
  setURLPrefix,
}
