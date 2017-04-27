// @flow

import invariant from 'invariant';

export type URLInfo = {
  year?: number,
  month?: number, // 1-indexed
  home?: bool,
  calendarID?: string,
  verify?: string,
};

function infoFromURL(url: string): URLInfo {
  const yearMatches = new RegExp('(/|^)year/([0-9]+)(/|$)', 'i').exec(url);
  const monthMatches = new RegExp('(/|^)month/([0-9]+)(/|$)', 'i').exec(url);
  const calendarMatches = new RegExp('(/|^)calendar/([0-9]+)(/|$)', 'i')
    .exec(url);
  const verifyMatches = new RegExp('(/|^)verify/([a-f0-9]+)(/|$)', 'i')
    .exec(url);
  const homeTest = new RegExp('(/|^)home(/|$)', 'i').test(url);
  invariant(
    !homeTest || !calendarMatches,
    'home and calendar should never be set at the same time',
  );
  const returnObj = {};
  if (yearMatches) {
    returnObj.year = parseInt(yearMatches[2]);
  }
  if (monthMatches) {
    returnObj.month = parseInt(monthMatches[2]);
  }
  if (calendarMatches) {
    returnObj.calendarID = calendarMatches[2];
  }
  if (verifyMatches) {
    returnObj.verify = verifyMatches[2];
  }
  if (homeTest) {
    returnObj.home = true;
  }
  return returnObj;
}

export {
  infoFromURL,
}
