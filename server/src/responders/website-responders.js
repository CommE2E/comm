// @flow

import type { $Response, $Request } from 'express';
import type { AppState, Action } from 'web/redux/redux-setup';
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
import fs from 'fs';
import { promisify } from 'util';

import { ServerError } from 'lib/utils/errors';
import { currentDateInTimeZone } from 'lib/utils/date-utils';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { freshMessageStore } from 'lib/reducers/message-reducer';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import { mostRecentReadThread } from 'lib/selectors/thread-selectors';
import { threadHasPermission } from 'lib/shared/thread-utils';
import { promiseAll } from 'lib/utils/promises';

import * as ReduxSetup from 'web/redux/redux-setup';
import App from 'web/dist/app.build.cjs';
import { navInfoFromURL } from 'web/url-utils';

import { Viewer } from '../session/viewer';
import { handleCodeVerificationRequest } from '../models/verification';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import { setNewSession } from '../session/cookies';
import urlFacts from '../../facts/url';
import { streamJSON, waitForStream } from '../utils/json-stream';

const { basePath, baseDomain } = urlFacts;
const { renderToNodeStream } = ReactDOMServer;
const { Provider } = ReactRedux;
const { reducer } = ReduxSetup;
const { Route, StaticRouter } = ReactRouter;

const baseURL = basePath.replace(/\/$/, '');
const baseHref = baseDomain + baseURL;

const access = promisify(fs.access);
const googleFontsURL =
  'https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim';
const localFontsURL = 'fonts/local-fonts.css';
async function getFontsURL() {
  try {
    await access(localFontsURL);
    return localFontsURL;
  } catch {
    return googleFontsURL;
  }
}

type AssetInfo = {| jsURL: string, fontsURL: string, cssInclude: string |};
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === 'dev') {
    const fontsURL = await getFontsURL();
    assetInfo = {
      jsURL: 'http://localhost:8080/dev.build.js',
      fontsURL,
      cssInclude: '',
    };
    return assetInfo;
  }
  // $FlowFixMe compiled/assets.json doesn't always exist
  const { default: assets } = await import('../../compiled/assets');
  assetInfo = {
    jsURL: `compiled/${assets.browser.js}`,
    fontsURL: googleFontsURL,
    cssInclude: html`
      <link
        rel="stylesheet"
        type="text/css"
        href="compiled/${assets.browser.css}"
      />
    `,
  };
  return assetInfo;
}

async function websiteResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  let initialNavInfo;
  try {
    initialNavInfo = navInfoFromURL(req.url, {
      now: currentDateInTimeZone(viewer.timeZone),
    });
  } catch (e) {
    throw new ServerError(e.message);
  }

  const calendarQuery = {
    startDate: initialNavInfo.startDate,
    endDate: initialNavInfo.endDate,
    filters: defaultCalendarFilters,
  };
  const threadSelectionCriteria = { joinedThreads: true };
  const initialTime = Date.now();

  const assetInfoPromise = getAssetInfo();
  const threadInfoPromise = fetchThreadInfos(viewer);
  const messageInfoPromise = fetchMessageInfos(
    viewer,
    threadSelectionCriteria,
    defaultNumberPerThread,
  );
  const entryInfoPromise = fetchEntryInfos(viewer, [calendarQuery]);
  const currentUserInfoPromise = fetchCurrentUserInfo(viewer);
  const serverVerificationResultPromise = handleVerificationRequest(
    viewer,
    initialNavInfo.verify,
  );
  const userInfoPromise = fetchKnownUserInfos(viewer);

  const sessionIDPromise = (async () => {
    if (viewer.loggedIn) {
      await setNewSession(viewer, calendarQuery, initialTime);
    }
    return viewer.sessionID;
  })();

  const threadStorePromise = (async () => {
    const { threadInfos } = await threadInfoPromise;
    return { threadInfos, inconsistencyReports: [] };
  })();
  const messageStorePromise = (async () => {
    const [
      { threadInfos },
      { rawMessageInfos, truncationStatuses },
    ] = await Promise.all([threadInfoPromise, messageInfoPromise]);
    return freshMessageStore(
      rawMessageInfos,
      truncationStatuses,
      mostRecentMessageTimestamp(rawMessageInfos, initialTime),
      threadInfos,
    );
  })();
  const entryStorePromise = (async () => {
    const { rawEntryInfos } = await entryInfoPromise;
    return {
      entryInfos: _keyBy('id')(rawEntryInfos),
      daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
      lastUserInteractionCalendar: initialTime,
      inconsistencyReports: [],
    };
  })();
  const userStorePromise = (async () => {
    const userInfos = await userInfoPromise;
    return { userInfos, inconsistencyReports: [] };
  })();

  const navInfoPromise = (async () => {
    const [{ threadInfos }, messageStore] = await Promise.all([
      threadInfoPromise,
      messageStorePromise,
    ]);
    let finalNavInfo = initialNavInfo;

    const requestedActiveChatThreadID = finalNavInfo.activeChatThreadID;
    if (
      requestedActiveChatThreadID &&
      !threadHasPermission(
        threadInfos[requestedActiveChatThreadID],
        threadPermissions.VISIBLE,
      )
    ) {
      finalNavInfo.activeChatThreadID = null;
    }

    if (!finalNavInfo.activeChatThreadID) {
      const mostRecentThread = mostRecentReadThread(messageStore, threadInfos);
      if (mostRecentThread) {
        finalNavInfo.activeChatThreadID = mostRecentThread;
      }
    }

    return finalNavInfo;
  })();

  const { jsURL, fontsURL, cssInclude } = await assetInfoPromise;

  // prettier-ignore
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
      </head>
      <body>
        <div id="react-root">
  `);

  const statePromises = {
    navInfo: navInfoPromise,
    currentUserInfo: currentUserInfoPromise,
    sessionID: sessionIDPromise,
    serverVerificationResult: serverVerificationResultPromise,
    entryStore: entryStorePromise,
    threadStore: threadStorePromise,
    userStore: userStorePromise,
    messageStore: messageStorePromise,
    updatesCurrentAsOf: initialTime,
    loadingStatuses: {},
    calendarFilters: defaultCalendarFilters,
    // We can use paths local to the <base href> on web
    urlPrefix: '',
    windowDimensions: { width: 0, height: 0 },
    baseHref,
    connection: {
      ...defaultConnectionInfo('web', viewer.timeZone),
      actualizedCalendarQuery: calendarQuery,
    },
    watchedThreadIDs: [],
    foreground: true,
    nextLocalID: 0,
    queuedReports: [],
    timeZone: viewer.timeZone,
    userAgent: viewer.userAgent,
    cookie: undefined,
    deviceToken: undefined,
    dataLoaded: viewer.loggedIn,
    windowActive: true,
  };

  const stateResult = await promiseAll(statePromises);
  const state: AppState = { ...stateResult };
  const store: Store<AppState, Action> = createStore(reducer, state);

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
    throw new ServerError('URL modified during server render!');
  }
  reactStream.pipe(res, { end: false });
  await waitForStream(reactStream);
  res.write(html`
    </div>
    <script>
      var preloadedState =
  `);

  const filteredStatePromises = {
    ...statePromises,
    timeZone: null,
    userAgent: null,
  };
  const jsonStream = streamJSON(res, filteredStatePromises);
  await waitForStream(jsonStream);
  res.end(html`
    ;
          var baseURL = "${baseURL}";
        </script>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
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

export { websiteResponder };
