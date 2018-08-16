// @flow

import type { $Response, $Request } from 'express';
import type { AppState, Action } from 'web/redux-setup';
import type { Store } from 'redux';
import { defaultPingTimestamps } from 'lib/types/ping-types';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { threadPermissions } from 'lib/types/thread-types';

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
import { newSessionID } from 'lib/reducers/session-reducer';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { freshMessageStore } from 'lib/reducers/message-reducer';
import { verifyField } from 'lib/types/verify-types';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentReadThread } from 'lib/selectors/thread-selectors';
import { threadHasPermission } from 'lib/shared/thread-utils';

import 'web/server-rendering';
import * as ReduxSetup from 'web/redux-setup';
import App from 'web/dist/app.build';
import { navInfoFromURL } from 'web/url-utils';

import { Viewer } from '../session/viewer';
import { handleCodeVerificationRequest } from '../models/verification';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchCurrentUserInfo } from '../fetchers/user-fetchers';
import { updateActivityTime } from '../updaters/activity-updaters';
import { createFilter } from '../creators/filter-creator';
import urlFacts from '../../facts/url';
import assets from '../../compiled/assets';

const { basePath } = urlFacts;
const { renderToString } = ReactDOMServer;
const { AppContainer } = ReactHotLoader;
const { Provider } = ReactRedux;
const { reducer } = ReduxSetup;

async function websiteResponder(viewer: Viewer, url: string): Promise<string> {
  let navInfo;
  try {
    navInfo = navInfoFromURL(url);
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
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchCurrentUserInfo(viewer),
    fetchEntryInfos(viewer, calendarQuery),
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    navInfo.verify ? handleCodeVerificationRequest(navInfo.verify) : null,
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

  // Do these ones separately in case any of the above throw an exception
  const sessionID = newSessionID();
  viewer.setSessionID(sessionID);
  await Promise.all([
    updateActivityTime(viewer),
    // We know we have to create a new filter since we just generated
    // the sessionID and web always passes up the sessionID
    createFilter(viewer, calendarQuery),
  ]);

  const time = Date.now();
  const store: Store<AppState, Action> = createStore(
    reducer,
    ({
      navInfo,
      currentUserInfo,
      sessionID,
      verifyField: verificationResult && verificationResult.field,
      resetPasswordUsername:
        verificationResult && verificationResult.resetPasswordUsername
          ? verificationResult.resetPasswordUsername
          : "",
      entryStore: {
        entryInfos: _keyBy('id')(rawEntryInfos),
        daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
        actualizedCalendarQuery: calendarQuery,
        lastUserInteractionCalendar: time,
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
      drafts: {},
      updatesCurrentAsOf: initialTime,
      loadingStatuses: {},
      pingTimestamps: defaultPingTimestamps,
      activeServerRequests: [],
      calendarFilters: defaultCalendarFilters,
      cookie: undefined,
      deviceToken: null,
      // We can use paths local to the <base href> on web
      urlPrefix: "",
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
    : `compiled/${assets.browser.js}`;
  const cssInclude = process.env.NODE_ENV === "dev"
    ? ""
    : html`<link
        rel="stylesheet"
        type="text/css"
        href="compiled/${assets.browser.css}"
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

export {
  websiteResponder,
};
