// @flow

import invariant from 'invariant';

import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';

import { yearExtractor, monthExtractor } from './selectors/nav-selectors.js';
import type { NavInfo } from './types/nav-types.js';

function canonicalURLFromReduxState(
  navInfo: NavInfo,
  currentURL: string,
  loggedIn: boolean,
): string {
  const urlInfo = infoFromURL(currentURL);
  const today = new Date();
  let newURL = `/`;

  if (loggedIn) {
    newURL += `${navInfo.tab}/`;
    if (navInfo.tab === 'calendar') {
      const { startDate, endDate } = navInfo;
      const year = yearExtractor(startDate, endDate);
      if (urlInfo.year !== undefined) {
        invariant(
          year !== null && year !== undefined,
          `${startDate} and ${endDate} aren't in the same year`,
        );
        newURL += `year/${year}/`;
      } else if (
        year !== null &&
        year !== undefined &&
        year !== today.getFullYear()
      ) {
        newURL += `year/${year}/`;
      }

      const month = monthExtractor(startDate, endDate);
      if (urlInfo.month !== undefined) {
        invariant(
          month !== null && month !== undefined,
          `${startDate} and ${endDate} aren't in the same month`,
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
      if (navInfo.chatMode === 'create') {
        const users = navInfo.selectedUserList?.join('+') ?? '';
        const potentiallyTrailingSlash = users.length > 0 ? '/' : '';
        newURL += `thread/new/${users}${potentiallyTrailingSlash}`;
      } else {
        const activeChatThreadID = navInfo.activeChatThreadID;
        if (activeChatThreadID) {
          newURL += `thread/${activeChatThreadID}/`;
        }
      }
    } else if (navInfo.tab === 'settings' && navInfo.settingsSection) {
      newURL += `${navInfo.settingsSection}/`;
    }
  }

  return newURL;
}

// Given a URL, this function parses out a navInfo object, leaving values as
// default if they are unspecified.
function navInfoFromURL(
  url: string,
  backupInfo: { now?: Date, navInfo?: NavInfo },
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

  let tab = 'chat';
  if (urlInfo.calendar) {
    tab = 'calendar';
  } else if (urlInfo.settings) {
    tab = 'settings';
  }

  const chatMode =
    urlInfo.threadCreation || navInfo?.chatMode === 'create'
      ? 'create'
      : 'view';

  const newNavInfo: NavInfo = {
    tab,
    startDate: startDateForYearAndMonth(year, month),
    endDate: endDateForYearAndMonth(year, month),
    activeChatThreadID,
    chatMode,
  };

  if (urlInfo.selectedUserList) {
    newNavInfo.selectedUserList = urlInfo.selectedUserList;
  }

  if (urlInfo.settings) {
    newNavInfo.settingsSection = urlInfo.settings;
  }

  return newNavInfo;
}

export { canonicalURLFromReduxState, navInfoFromURL };
