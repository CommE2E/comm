// @flow

import type { $Response, $Request } from 'express';
import type { AppState, Action } from 'web/redux-setup';
import type { Store } from 'redux';
import { defaultPingTimestamps } from 'lib/types/ping-types';

import html from 'common-tags/lib/html';
import { createStore } from 'redux';
import ReactDOMServer from 'react-dom/server';
import ReactHotLoader from 'react-hot-loader';
import ReactRedux from 'react-redux';
import { Route, StaticRouter } from 'react-router';
import React from 'react';
import _keyBy from 'lodash/fp/keyBy';

import { ServerError } from 'lib/utils/errors';
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { newSessionID } from 'lib/selectors/session-selectors';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { freshMessageStore } from 'lib/reducers/message-reducer';
import { verifyField } from 'lib/types/verify-types';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import * as ReduxSetup from 'web/redux-setup';
import App from 'web/dist/app.build';

import { Viewer } from '../session/viewer';
import { handleCodeVerificationRequest } from '../models/verification';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { verifyThreadID, fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import urlFacts from '../../facts/url';

const { basePath } = urlFacts;
const { renderToString } = ReactDOMServer;
const { AppContainer } = ReactHotLoader;
const { Provider } = ReactRedux;
const { reducer } = ReduxSetup;

async function websiteResponder(viewer: Viewer, url: string): Promise<string> {
  const urlInfo = parseURL(url);

  const calendarQuery = {
    startDate: startDateForYearAndMonth(urlInfo.year, urlInfo.month),
    endDate: endDateForYearAndMonth(urlInfo.year, urlInfo.month),
    navID: urlInfo.home ? "home" : urlInfo.threadID,
  };
  const threadSelectionCriteria = { joinedThreads: true };
  const initialTime = Date.now();

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
  if (urlInfo.threadID && !threadInfos[urlInfo.threadID]) {
    const validThreadID = await verifyThreadID(urlInfo.threadID);
    if (!validThreadID) {
      throw new ServerError("invalid_thread_id");
    }
  }

  // Do this one separately in case any of the above throw an exception
  await updateActivityTime(viewer);

  const time = Date.now();
  const messagesCurrentAsOf = mostRecentMessageTimestamp(
    rawMessageInfos,
    initialTime,
  );
  const store: Store<AppState, Action> = createStore(
    reducer,
    ({
      navInfo: {
        startDate: calendarQuery.startDate,
        endDate: calendarQuery.endDate,
        home: urlInfo.home,
        threadID: urlInfo.threadID,
        verify: urlInfo.verificationCode,
      },
      currentUserInfo,
      sessionID: newSessionID(),
      verifyField: verificationResult && verificationResult.field,
      resetPasswordUsername:
        verificationResult && verificationResult.resetPasswordUsername
          ? verificationResult.resetPasswordUsername
          : "",
      entryStore: {
        entryInfos: _keyBy('id')(rawEntryInfos),
        daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
        lastUserInteractionCalendar: time,
      },
      lastUserInteraction: { sessionReset: time },
      threadInfos,
      userInfos: {
        ...messageUserInfos,
        ...entryUserInfos,
        ...threadUserInfos,
      },
      messageStore: freshMessageStore(
        rawMessageInfos,
        truncationStatuses,
        messagesCurrentAsOf,
        threadInfos,
      ),
      drafts: {},
      updatesCurrentAsOf: initialTime,
      loadingStatuses: {},
      pingTimestamps: defaultPingTimestamps,
      activeServerRequests: [],
      cookie: undefined,
      deviceToken: null,
      // We can use paths local to the <base href> on web
      urlPrefix: "",
      typeaheadRecommendedThreads: null,
      windowDimensions: { width: 0, height: 0 },
    }: AppState),
  );
  const routerContext = {};
  const baseURL = basePath.replace(/\/$/, '');
  const rendered = renderToString(
    <AppContainer>
      <Provider store={store}>
        <StaticRouter
          location={url}
          basename={baseURL}
          context={routerContext}
        >
          <Route path="*" component={App.default} />
        </StaticRouter>
      </Provider>
    </AppContainer>,
  );
  if (routerContext.url) {
    throw new ServerError("URL modified during server render!");
  }

  const state = store.getState();
  const stringifiedState = JSON.stringify(state).replace(/</g, '\\u003c');

  const fontsURL = process.env.NODE_ENV === "dev"
    ? "fonts/local-fonts.css"
    : "https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim";
  const jsURL = process.env.NODE_ENV === "dev"
    ? "compiled/dev.build.js"
    : "compiled/prod.build.js";
  const cssInclude = process.env.NODE_ENV === "dev"
    ? ""
    : html`<link
        rel="stylesheet"
        type="text/css"
        href="compiled/prod.build.css"
      />`;
  let result = html`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>SquadCal</title>
        <base href="${basePath}" />
        <link rel="stylesheet" type="text/css" href="${fontsURL}" />
        ${cssInclude}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="favicon-16x16.png"
        />
        <link rel="manifest" href="site.webmanifest" />
        <link rel="mask-icon" href="safari-pinned-tab.svg" color="#b91d47" />
        <meta name="apple-mobile-web-app-title" content="SquadCal" />
        <meta name="application-name" content="SquadCal" />
        <meta name="msapplication-TileColor" content="#b91d47" />
        <meta name="theme-color" content="#b91d47" />
        <script>
          var preloadedState = ${stringifiedState};
          var baseURL = "${baseURL}";
        </script>
      </head>
      <body>
        <div id="react-root">
  `;
  result += rendered;
  result += html`
        </div>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `;
  return result;
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
