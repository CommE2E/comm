// @flow

import invariant from 'invariant';

import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { infoFromURL } from 'lib/utils/url-utils';

import type { NavInfo } from './redux/redux-setup';
import { yearExtractor, monthExtractor } from './selectors/nav-selectors';

function canonicalURLFromReduxState(navInfo: NavInfo, currentURL: string) {
  const urlInfo = infoFromURL(currentURL);
  const today = new Date();
  let newURL = `/${navInfo.tab}/`;

  if (navInfo.tab === 'calendar') {
    const year = yearExtractor(navInfo.startDate, navInfo.endDate);
    if (urlInfo.year !== undefined) {
      invariant(
        year !== null && year !== undefined,
        `${navInfo.startDate} and ${navInfo.endDate} aren't in the same year`,
      );
      newURL += `year/${year}/`;
    } else if (
      year !== null &&
      year !== undefined &&
      year !== today.getFullYear()
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
      month !== null &&
      month !== undefined &&
      month !== today.getMonth() + 1
    ) {
      newURL += `month/${month}/`;
    }
  } else if (navInfo.tab === 'chat') {
    const activeChatThreadID = navInfo.activeChatThreadID;
    if (activeChatThreadID) {
      newURL += `thread/${activeChatThreadID}/`;
    }
  }

  if (navInfo.verify) {
    newURL += `verify/${navInfo.verify}/`;
  }

  return newURL;
}

// Given a URL, this function parses out a navInfo object, leaving values as
// default if they are unspecified.
function navInfoFromURL(
  url: string,
  backupInfo: {| now?: Date, navInfo?: NavInfo |},
): NavInfo {
  const urlInfo = infoFromURL(url);
  const { navInfo } = backupInfo;
  const now = backupInfo.now ? backupInfo.now : new Date();

  let year = urlInfo.year;
  if (!year && navInfo) {
    year = yearExtractor(navInfo.startDate, navInfo.endDate);
  }
  if (!year) {
    year = now.getFullYear();
  }

  let month = urlInfo.month;
  if (!month && navInfo) {
    month = monthExtractor(navInfo.startDate, navInfo.endDate);
  }
  if (!month) {
    month = now.getMonth() + 1;
  }

  let activeChatThreadID = null;
  if (urlInfo.thread) {
    activeChatThreadID = urlInfo.thread.toString();
  } else if (navInfo) {
    activeChatThreadID = navInfo.activeChatThreadID;
  }

  return {
    tab: urlInfo.chat ? 'chat' : 'calendar',
    startDate: startDateForYearAndMonth(year, month),
    endDate: endDateForYearAndMonth(year, month),
    activeChatThreadID,
    verify: urlInfo.verify ? urlInfo.verify : null,
  };
}

export { canonicalURLFromReduxState, navInfoFromURL };
