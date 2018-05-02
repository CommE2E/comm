// @flow

import type { Store } from 'redux';
import type { NavInfo, AppState, Action } from './redux-setup';

import invariant from 'invariant';
import { createSelector } from 'reselect';

import { infoFromURL } from 'lib/utils/url-utils';
import {
  yearExtractor,
  yearAssertingSelector,
  monthExtractor,
  monthAssertingSelector,
} from './selectors/nav-selectors';
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';

function urlForHomeAndThreadID(home: bool, threadID: ?string) {
  if (home) {
    return "home/";
  }
  invariant(threadID, "either home or threadID should be set");
  return `thread/${threadID}/`;
}

function canonicalURLFromReduxState(navInfo: NavInfo, currentURL: string) {
  const urlInfo = infoFromURL(currentURL);
  const today = new Date();
  let newURL = `/${navInfo.tab}/`;
  newURL += urlForHomeAndThreadID(navInfo.home, navInfo.threadID);

  const year = yearExtractor(navInfo.startDate, navInfo.endDate);
  if (urlInfo.year !== undefined) {
    invariant(
      year !== null && year !== undefined,
      `${navInfo.startDate} and ${navInfo.endDate} aren't in the same year`,
    );
    newURL += `year/${year}/`;
  } else if (
    year !== null && year !== undefined && year !== today.getFullYear()
  ) {
    newURL += `year/${year}/`;
  }

  const month = monthExtractor(navInfo.startDate, navInfo.endDate);
  if (urlInfo.month !== undefined) {
    invariant(
      month !== null && month !== undefined,
      `${navInfo.startDate} and ${navInfo.endDate} aren't in the same month`,
    );
    newURL += `month/${month}/`;
  } else if (
    month !== null && month !== undefined && month !== (today.getMonth() + 1)
  ) {
    newURL += `month/${month}/`;
  }

  if (navInfo.verify) {
    newURL += `verify/${navInfo.verify}/`;
  }

  return newURL;
}

// Given a URL, this function parses out a navInfo object, leaving values as
// default if they are unspecified. 
function navInfoFromURL(url: string): NavInfo {
  const urlInfo = infoFromURL(url);
  const today = new Date();
  const year = urlInfo.year ? urlInfo.year : today.getFullYear();
  const month = urlInfo.month ? urlInfo.month : (today.getMonth() + 1);
  return {
    startDate: startDateForYearAndMonth(year, month),
    endDate: endDateForYearAndMonth(year, month),
    home: !!urlInfo.home,
    threadID: urlInfo.threadID ? urlInfo.threadID : null,
    tab: urlInfo.chat ? "chat" : "calendar",
    verify: urlInfo.verify ? urlInfo.verify : null,
  };
}

function ensureNavInfoValid(
  newNavInfo: NavInfo,
  oldNavInfo?: NavInfo,
): NavInfo {
  let result = newNavInfo;

  if (result.home || result.threadID) {
  } else if (oldNavInfo && !oldNavInfo.home && oldNavInfo.threadID) {
    result = {
      startDate: result.startDate,
      endDate: result.endDate,
      home: false,
      threadID: oldNavInfo.threadID,
      tab: result.tab,
      verify: result.verify,
    };
  } else {
    result = {
      startDate: result.startDate,
      endDate: result.endDate,
      home: true,
      threadID: null,
      tab: result.tab,
      verify: result.verify,
    };
  }

  return result;
}

export {
  canonicalURLFromReduxState,
  navInfoFromURL,
  ensureNavInfoValid,
};
