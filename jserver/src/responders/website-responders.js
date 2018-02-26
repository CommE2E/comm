// @flow

import type { $Response, $Request } from 'express';

import html from 'common-tags/lib/html';

import { ServerError } from 'lib/utils/fetch-utils';
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { defaultNumberPerThread } from 'lib/types/message-types';

import {
  fetchViewerForHomeRequest,
  addCookieToHomeResponse,
} from '../session/cookies';
import { Viewer } from '../session/viewer';
import { handleCodeVerificationRequest } from '../models/verification';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { verifyThreadID, fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import urlFacts from '../../facts/url';

const { basePath } = urlFacts;

async function websiteResponder(req: $Request, res: $Response) {
  try {
    const viewer = await fetchViewerForHomeRequest(req);
    const rendered = await renderHTML(viewer, req.url);
    addCookieToHomeResponse(viewer, res);
    res.send(rendered);
  } catch (e) {
    console.warn(e);
    if (!res.headersSent) {
      res.status(500).send(e.message);
    }
  }
}

async function renderHTML(viewer: Viewer, url: string): Promise<string> {
  const urlInfo = parseURL(url);

  const calendarQuery = {
    startDate: startDateForYearAndMonth(urlInfo.year, urlInfo.month),
    endDate: endDateForYearAndMonth(urlInfo.year, urlInfo.month),
    navID: urlInfo.home ? "home" : urlInfo.threadID,
  };
  const threadSelectionCriteria = { joinedThreads: true };
  const serverTime = Date.now();

  const [
    { threadInfos, userInfos: threadUserInfos },
    currentUserInfo,
    { rawEntryInfos, userInfos: entryUserInfos },
    { rawMessageInfos, truncationStatuses, userInfos: messageUserInfos },
    verificationResult,
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchCurrentUserInfo(viewer),
    fetchEntryInfos(viewer, calendarQuery),
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    urlInfo.verificationCode
      ? handleCodeVerificationRequest(urlInfo.verificationCode)
      : null,
  ]);
  const userInfos = {
    ...messageUserInfos,
    ...entryUserInfos,
    ...threadUserInfos,
  };
  if (urlInfo.threadID && !threadInfos[urlInfo.threadID]) {
    const validThreadID = await verifyThreadID(urlInfo.threadID);
    if (!validThreadID) {
      throw new ServerError("invalid_thread_id");
    }
  }

  // Do this one separately in case any of the above throw an exception
  await updateActivityTime(viewer, serverTime);

  // handle verificationCode

  const fontsURL = process.env.NODE_ENV === "dev"
    ? "fonts/local-fonts.css"
    : "https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim";
  const jsURL = process.env.NODE_ENV === "dev"
    ? "compiled/dev.build.js"
    : "compiled/prod.build.js";
  return html`
    <html lang="en" class="no-js">
      <head>
        <meta charset="utf-8" />
        <title>SquadCal</title>
        <base href="${basePath}" />
        <link rel="stylesheet" type="text/css" href="${fontsURL}" />
        <script>
        </script>
      </head>
      <body>
        <div id="react-root" />
        <script src="${jsURL}"></script>
      </body>
    </html>
  `;
}

type BaseURLInfo = {| year: number, month: number, verificationCode: ?string |};
type URLInfo =
  | {| ...BaseURLInfo, home: true, threadID: null |}
  | {| ...BaseURLInfo, home: false, threadID: string |};

const yearRegex = new RegExp("/year/([0-9]+)(/|$)", 'i');
const monthRegex = new RegExp("/month/([0-9]+)(/|$)", 'i');
const threadRegex = new RegExp("/thread/([0-9]+)(/|$)", 'i');
const homeRegex = new RegExp("/home(/|$)", 'i');
const verifyRegex = new RegExp("/verify/([a-f0-9]+)(/|$)", 'i');

function parseURL(url: string): URLInfo {
  const yearMatches = yearRegex.exec(url);
  const monthMatches = monthRegex.exec(url);
  const threadMatches = threadRegex.exec(url);
  const homeMatches = homeRegex.exec(url);
  const verifyMatches = verifyRegex.exec(url);

  const year = yearMatches
    ? parseInt(yearMatches[1])
    : new Date().getFullYear();
  const month = monthMatches
    ? parseInt(monthMatches[1])
    : new Date().getMonth() + 1;
  if (month < 1 || month > 12) {
    throw new ServerError("invalid_month");
  }
  const verificationCode = verifyMatches ? verifyMatches[1] : null;

  if (!homeMatches && threadMatches) {
    const threadID = parseInt(threadMatches[1]).toString();
    return { year, month, home: false, threadID, verificationCode };
  } else {
    return { year, month, home: true, threadID: null, verificationCode };
  }
}

export {
  websiteResponder,
};
