// @flow

import html from 'common-tags/lib/html';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import _keyBy from 'lodash/fp/keyBy';
import * as React from 'react';
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { freshMessageStore } from 'lib/reducers/message-reducer';
import { mostRecentlyReadThread } from 'lib/selectors/thread-selectors';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils';
import {
  threadHasPermission,
  threadIsPending,
  parsePendingThreadID,
  createPendingThread,
} from 'lib/shared/thread-utils';
import { defaultWebEnabledApps } from 'lib/types/enabled-apps';
import { defaultCalendarFilters } from 'lib/types/filter-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { defaultEnabledReports } from 'lib/types/report-types';
import { defaultConnectionInfo } from 'lib/types/socket-types';
import { threadPermissions, threadTypes } from 'lib/types/thread-types';
import { currentDateInTimeZone } from 'lib/utils/date-utils';
import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import getTitle from 'web/title/getTitle';
import { navInfoFromURL } from 'web/url-utils';

import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import { setNewSession } from '../session/cookies';
import { Viewer } from '../session/viewer';
import { streamJSON, waitForStream } from '../utils/json-stream';
import { getAppURLFactsFromRequestURL } from '../utils/urls';

const { renderToNodeStream } = ReactDOMServer;

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const googleFontsURL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Inter:wght@400;500;600&display=swap';
const localFontsURL = 'fonts/local-fonts.css';
async function getFontsURL() {
  try {
    await access(localFontsURL);
    return localFontsURL;
  } catch {
    return googleFontsURL;
  }
}

type AssetInfo = { jsURL: string, fontsURL: string, cssInclude: string };
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === 'development') {
    const fontsURL = await getFontsURL();
    assetInfo = {
      jsURL: 'http://localhost:8080/dev.build.js',
      fontsURL,
      cssInclude: '',
    };
    return assetInfo;
  }
  try {
    const assetsString = await readFile('../web/dist/assets.json', 'utf8');
    const assets = JSON.parse(assetsString);
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
  } catch {
    throw new Error(
      'Could not load assets.json for web build. ' +
        'Did you forget to run `yarn dev` in the web folder?',
    );
  }
}

let webpackCompiledRootComponent: ?React.ComponentType<{}> = null;
async function getWebpackCompiledRootComponentForSSR() {
  if (webpackCompiledRootComponent) {
    return webpackCompiledRootComponent;
  }
  try {
    // $FlowFixMe web/dist doesn't always exist
    const webpackBuild = await import('web/dist/app.build.cjs');
    webpackCompiledRootComponent = webpackBuild.default.default;
    return webpackCompiledRootComponent;
  } catch {
    throw new Error(
      'Could not load app.build.cjs. ' +
        'Did you forget to run `yarn dev` in the web folder?',
    );
  }
}

async function websiteResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  const appURLFacts = getAppURLFactsFromRequestURL(req.originalUrl);
  const { basePath, baseDomain } = appURLFacts;
  const baseURL = basePath.replace(/\/$/, '');
  const baseHref = baseDomain + baseURL;

  const loadingPromise = getWebpackCompiledRootComponentForSSR();

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
  const messageSelectionCriteria = { joinedThreads: true };
  const initialTime = Date.now();

  const assetInfoPromise = getAssetInfo();
  const threadInfoPromise = fetchThreadInfos(viewer);
  const messageInfoPromise = fetchMessageInfos(
    viewer,
    messageSelectionCriteria,
    defaultNumberPerThread,
  );
  const entryInfoPromise = fetchEntryInfos(viewer, [calendarQuery]);
  const currentUserInfoPromise = fetchCurrentUserInfo(viewer);
  const userInfoPromise = fetchKnownUserInfos(viewer);

  const sessionIDPromise = (async () => {
    if (viewer.loggedIn) {
      await setNewSession(viewer, calendarQuery, initialTime);
    }
    return viewer.sessionID;
  })();

  const threadStorePromise = (async () => {
    const { threadInfos } = await threadInfoPromise;
    return { threadInfos };
  })();
  const messageStorePromise = (async () => {
    const [
      { threadInfos },
      { rawMessageInfos, truncationStatuses },
    ] = await Promise.all([threadInfoPromise, messageInfoPromise]);
    const { messageStore: freshStore } = freshMessageStore(
      rawMessageInfos,
      truncationStatuses,
      mostRecentMessageTimestamp(rawMessageInfos, initialTime),
      threadInfos,
    );
    return freshStore;
  })();
  const entryStorePromise = (async () => {
    const { rawEntryInfos } = await entryInfoPromise;
    return {
      entryInfos: _keyBy('id')(rawEntryInfos),
      daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
      lastUserInteractionCalendar: initialTime,
    };
  })();
  const userStorePromise = (async () => {
    const userInfos = await userInfoPromise;
    return { userInfos, inconsistencyReports: [] };
  })();

  const navInfoPromise = (async () => {
    const [
      { threadInfos },
      messageStore,
      currentUserInfo,
      userStore,
    ] = await Promise.all([
      threadInfoPromise,
      messageStorePromise,
      currentUserInfoPromise,
      userStorePromise,
    ]);
    const finalNavInfo = initialNavInfo;

    const requestedActiveChatThreadID = finalNavInfo.activeChatThreadID;
    if (
      requestedActiveChatThreadID &&
      !threadIsPending(requestedActiveChatThreadID) &&
      !threadHasPermission(
        threadInfos[requestedActiveChatThreadID],
        threadPermissions.VISIBLE,
      )
    ) {
      finalNavInfo.activeChatThreadID = null;
    }

    if (!finalNavInfo.activeChatThreadID) {
      const mostRecentThread = mostRecentlyReadThread(
        messageStore,
        threadInfos,
      );
      if (mostRecentThread) {
        finalNavInfo.activeChatThreadID = mostRecentThread;
      }
    }

    if (
      finalNavInfo.activeChatThreadID &&
      threadIsPending(finalNavInfo.activeChatThreadID) &&
      finalNavInfo.pendingThread?.id !== finalNavInfo.activeChatThreadID
    ) {
      const pendingThreadData = parsePendingThreadID(
        finalNavInfo.activeChatThreadID,
      );
      if (
        pendingThreadData &&
        pendingThreadData.threadType !== threadTypes.SIDEBAR &&
        currentUserInfo.id
      ) {
        const { userInfos } = userStore;
        const members = pendingThreadData.memberIDs
          .map(id => userInfos[id])
          .filter(Boolean);
        const newPendingThread = createPendingThread({
          viewerID: currentUserInfo.id,
          threadType: pendingThreadData.threadType,
          members,
        });
        finalNavInfo.activeChatThreadID = newPendingThread.id;
        finalNavInfo.pendingThread = newPendingThread;
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
        <title>${getTitle(0)}</title>
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
        <meta name="apple-mobile-web-app-title" content="Comm" />
        <meta name="application-name" content="Comm" />
        <meta name="msapplication-TileColor" content="#b91d47" />
        <meta name="theme-color" content="#b91d47" />
      </head>
      <body>
        <div id="react-root">
  `);

  const Loading = await loadingPromise;
  const reactStream = renderToNodeStream(<Loading />);
  reactStream.pipe(res, { end: false });

  await waitForStream(reactStream);
  res.write(html`
    </div>
    <script>
      var preloadedState =
  `);

  const initialReduxState = await promiseAll({
    navInfo: navInfoPromise,
    deviceID: null,
    currentUserInfo: currentUserInfoPromise,
    draftStore: { drafts: {} },
    sessionID: sessionIDPromise,
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
    lifecycleState: 'active',
    enabledApps: defaultWebEnabledApps,
    reportStore: {
      enabledReports: defaultEnabledReports,
      queuedReports: [],
    },
    nextLocalID: 0,
    cookie: undefined,
    deviceToken: undefined,
    dataLoaded: viewer.loggedIn,
    windowActive: true,
    userPolicies: {},
    _persist: null,
  });
  const jsonStream = streamJSON(res, initialReduxState);

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

export { websiteResponder };
