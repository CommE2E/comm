// @flow

import type { $Response, $Request } from 'express';
import type { AppState, Action } from 'web/redux-setup';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { threadPermissions } from 'lib/types/thread-types';
import { defaultConnectionInfo } from 'lib/types/socket-types';
import type { ServerVerificationResult } from 'lib/types/verify-types';

import html from 'common-tags/lib/html';
import { createStore, type Store } from 'redux';
import ReactDOMServer from 'react-dom/server';
import ReactRedux from 'react-redux';
import ReactRouter from 'react-router';
import React from 'react';
import _keyBy from 'lodash/fp/keyBy';

import { ServerError } from 'lib/utils/errors';
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
  currentDateInTimeZone,
} from 'lib/utils/date-utils';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { freshMessageStore } from 'lib/reducers/message-reducer';
import { verifyField } from 'lib/types/verify-types';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentReadThread } from 'lib/selectors/thread-selectors';
import { threadHasPermission } from 'lib/shared/thread-utils';

import 'web/server-rendering';
import * as ReduxSetup from 'web/redux-setup';
import App from 'web/dist/app.build.cjs';
import { navInfoFromURL } from 'web/url-utils';
import { activeThreadFromNavInfo } from 'web/selectors/nav-selectors';

import { Viewer } from '../session/viewer';
import { handleCodeVerificationRequest } from '../models/verification';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { setNewSession } from '../session/cookies';
import { activityUpdater } from '../updaters/activity-updaters';
import urlFacts from '../../facts/url';

const { basePath, baseDomain } = urlFacts;
const { renderToNodeStream } = ReactDOMServer;
const { Provider } = ReactRedux;
const { reducer } = ReduxSetup;
const { Route, StaticRouter } = ReactRouter;

type AssetInfo = {| jsURL: string, fontsURL: string, cssInclude: string |};
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === "dev") {
    assetInfo = {
      jsURL: "http://localhost:8080/dev.build.js",
      fontsURL: "fonts/local-fonts.css",
      cssInclude: "",
    };
    return assetInfo;
  }
  // $FlowFixMe compiled/assets.json doesn't always exist
  const { default: assets } = await import('../../compiled/assets');
  assetInfo = {
    jsURL: `compiled/${assets.browser.js}`,
    fontsURL: "https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim",
    cssInclude: html`<link
      rel="stylesheet"
      type="text/css"
      href="compiled/${assets.browser.css}"
    />`,
  };
  return assetInfo;
}

async function websiteResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  let navInfo;
  try {
    navInfo = navInfoFromURL(
      req.url,
      { now: currentDateInTimeZone(viewer.timeZone) },
    );
  } catch (e) {
    throw new ServerError(e.message);
  }

  const calendarQuery = {
    startDate: navInfo.startDate,
    endDate: navInfo.endDate,
    filters: defaultCalendarFilters,
  };
  const threadSelectionCriteria = { joinedThreads: true };
  const initialTime = Date.now();

  const [
    { threadInfos, userInfos: threadUserInfos },
    currentUserInfo,
    { rawEntryInfos, userInfos: entryUserInfos },
    { rawMessageInfos, truncationStatuses, userInfos: messageUserInfos },
    verificationResult,
    { jsURL, fontsURL, cssInclude },
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchCurrentUserInfo(viewer),
    fetchEntryInfos(viewer, [ calendarQuery ]),
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    handleVerificationRequest(viewer, navInfo.verify),
    getAssetInfo(),
    viewer.loggedIn ? setNewSession(viewer, calendarQuery, initialTime) : null,
  ]);

  const messageStore = freshMessageStore(
    rawMessageInfos,
    truncationStatuses,
    mostRecentMessageTimestamp(rawMessageInfos, initialTime),
    threadInfos,
  );

  const threadID = navInfo.activeChatThreadID;
  if (
    threadID &&
    !threadHasPermission(threadInfos[threadID], threadPermissions.VISIBLE)
  ) {
    navInfo.activeChatThreadID = null;
  }
  if (!navInfo.activeChatThreadID) {
    const mostRecentThread = mostRecentReadThread(messageStore, threadInfos);
    if (mostRecentThread) {
      navInfo.activeChatThreadID = mostRecentThread;
    }
  }
  const activeThread = activeThreadFromNavInfo(navInfo);
  if (activeThread) {
    await activityUpdater(
      viewer,
      { updates: [ { focus: true, threadID: activeThread } ] },
    );
  }

  const baseURL = basePath.replace(/\/$/, '');
  const store: Store<AppState, Action> = createStore(
    reducer,
    ({
      navInfo,
      currentUserInfo,
      sessionID: viewer.sessionID,
      serverVerificationResult: verificationResult,
      entryStore: {
        entryInfos: _keyBy('id')(rawEntryInfos),
        daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
        lastUserInteractionCalendar: initialTime,
        inconsistencyResponses: [],
      },
      threadStore: {
        threadInfos,
        inconsistencyResponses: [],
      },
      userInfos: {
        ...messageUserInfos,
        ...entryUserInfos,
        ...threadUserInfos,
      },
      messageStore,
      updatesCurrentAsOf: initialTime,
      loadingStatuses: {},
      calendarFilters: defaultCalendarFilters,
      // We can use paths local to the <base href> on web
      urlPrefix: "",
      windowDimensions: { width: 0, height: 0 },
      baseHref: baseDomain + baseURL,
      connection: {
        ...defaultConnectionInfo("web", viewer.timeZone),
        actualizedCalendarQuery: calendarQuery,
      },
      watchedThreadIDs: [],
      foreground: true,
      nextLocalID: 0,
      timeZone: viewer.timeZone,
      userAgent: viewer.userAgent,
    }: AppState),
  );
  const routerContext = {};
  const reactStream = renderToNodeStream(
    <Provider store={store}>
      <StaticRouter
        location={req.url}
        basename={baseURL}
        context={routerContext}
      >
        <Route path="*" component={App.default} />
      </StaticRouter>
    </Provider>,
  );
  if (routerContext.url) {
    throw new ServerError("URL modified during server render!");
  }

  const state = store.getState();
  const filteredState = { ...state, timeZone: null, userAgent: null };
  const stringifiedState =
    JSON.stringify(filteredState).replace(/</g, '\\u003c');

  res.write(html`
    <!DOCTYPE html>
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
  `);
  reactStream.pipe(res, { end: false });
  reactStream.on('end', () => {
    res.end(html`
          </div>
          <script src="${jsURL}"></script>
        </body>
      </html>
    `);
  });
}

async function handleVerificationRequest(
  viewer: Viewer,
  code: ?string,
): Promise<?ServerVerificationResult> {
  if (!code) {
    return null;
  }
  try {
    return await handleCodeVerificationRequest(viewer, code);
  } catch (e) {
    if (e instanceof ServerError && e.message === 'invalid_code') {
      return { success: false };
    }
    throw e;
  }
}

export {
  websiteResponder,
};
