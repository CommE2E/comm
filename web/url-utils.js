// @flow

import type { Store } from 'redux';
import type { NavInfo, AppState, Action } from './redux-setup';

import invariant from 'invariant';
import { createSelector } from 'reselect';

import { partialNavInfoFromURL } from 'lib/utils/url-utils';

function urlForYearAndMonth(year: number, month: number) {
  return `year/${year}/month/${month}/`;
}

const monthURL = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => urlForYearAndMonth(navInfo.year, navInfo.month),
);

function urlForHomeAndCalendarID(home: bool, calendarID: ?string) {
  if (home) {
    return "home/";
  }
  invariant(calendarID, "either home or calendarID should be set");
  return `calendar/${calendarID}/`;
}

const thisNavURLFragment = createSelector(
  (state: AppState) => state.navInfo,
  (navInfo: NavInfo) => urlForHomeAndCalendarID(
    navInfo.home,
    navInfo.calendarID
  ),
);

const thisURL = createSelector(
  monthURL,
  thisNavURLFragment,
  (monthURL: string, thisNavURLFragment: string) =>
    thisNavURLFragment + monthURL,
);

function canonicalURLFromReduxState(navInfo: NavInfo, currentURL: string) {
  const partialNavInfo = partialNavInfoFromURL(currentURL);
  let newURL = `/${urlForHomeAndCalendarID(navInfo.home, navInfo.calendarID)}`;
  if (partialNavInfo.year !== undefined) {
    newURL += `year/${navInfo.year}/`;
  }
  if (partialNavInfo.month !== undefined) {
    newURL += `month/${navInfo.month}/`;
  }
  if (navInfo.verify) {
    newURL += `verify/${navInfo.verify}/`;
  }
  return newURL;
}

// Given a URL, this function parses out a navInfo object, leaving values as
// default if they are unspecified. 
function navInfoFromURL(url: string): NavInfo {
  const partialNavInfo = partialNavInfoFromURL(url);
  const today = new Date();
  return {
    year: partialNavInfo.year ? partialNavInfo.year : today.getFullYear(),
    month: partialNavInfo.month ? partialNavInfo.month : (today.getMonth() + 1),
    home: !!partialNavInfo.home,
    calendarID: partialNavInfo.calendarID ? partialNavInfo.calendarID : null,
    verify: partialNavInfo.verify ? partialNavInfo.verify : null,
  };
}

export {
  urlForYearAndMonth,
  monthURL,
  urlForHomeAndCalendarID,
  thisNavURLFragment,
  thisURL,
  canonicalURLFromReduxState,
  navInfoFromURL,
};
