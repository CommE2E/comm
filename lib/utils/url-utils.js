// @flow

import urlParseLax from 'url-parse-lax';

export type URLInfo = {
  year?: number,
  month?: number, // 1-indexed
  verify?: string,
  calendar?: boolean,
  chat?: boolean,
  thread?: string,
  ...
};

const yearRegex = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i');
const monthRegex = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i');
const threadRegex = new RegExp('(/|^)thread/([0-9]+)(/|$)', 'i');
const verifyRegex = new RegExp('(/|^)verify/([a-f0-9]+)(/|$)', 'i');
const calendarRegex = new RegExp('(/|^)calendar(/|$)', 'i');
const chatRegex = new RegExp('(/|^)chat(/|$)', 'i');

function infoFromURL(url: string): URLInfo {
  const yearMatches = yearRegex.exec(url);
  const monthMatches = monthRegex.exec(url);
  const threadMatches = threadRegex.exec(url);
  const verifyMatches = verifyRegex.exec(url);
  const calendarTest = calendarRegex.test(url);
  const chatTest = chatRegex.test(url);
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
  if (verifyMatches) {
    returnObj.verify = verifyMatches[2];
  }
  if (calendarTest) {
    returnObj.calendar = true;
  } else if (chatTest) {
    returnObj.chat = true;
  }
  return returnObj;
}

function normalizeURL(url: string): string {
  return urlParseLax(url).href;
}

const setURLPrefix = 'SET_URL_PREFIX';

export { infoFromURL, normalizeURL, setURLPrefix };
