// @flow

import html from 'common-tags/lib/html/index.js';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import _keyBy from 'lodash/fp/keyBy.js';
import * as React from 'react';
// eslint-disable-next-line import/extensions
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer.js';
import { freshMessageStore } from 'lib/reducers/message-reducer.js';
import { mostRecentlyReadThread } from 'lib/selectors/thread-selectors.js';
import { mostRecentMessageTimestamp } from 'lib/shared/message-utils.js';
import {
  threadHasPermission,
  threadIsPending,
  parsePendingThreadID,
  createPendingThread,
} from 'lib/shared/thread-utils.js';
import { defaultWebEnabledApps } from 'lib/types/enabled-apps.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { defaultNumberPerThread } from 'lib/types/message-types.js';
import { defaultEnabledReports } from 'lib/types/report-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { threadPermissions, threadTypes } from 'lib/types/thread-types.js';
import { currentDateInTimeZone } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';
import getTitle from 'web/title/getTitle.js';
import { navInfoFromURL } from 'web/url-utils.js';

import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { hasAnyNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
  fetchUserInfos,
} from '../fetchers/user-fetchers.js';
import { setNewSession } from '../session/cookies.js';
import { Viewer } from '../session/viewer.js';
import { streamJSON, waitForStream } from '../utils/json-stream.js';
import { getAppURLFactsFromRequestURL } from '../utils/urls.js';

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
    webpackCompiledRootComponent = webpackBuild.app.default;
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
  const hasNotAcknowledgedPoliciesPromise = hasAnyNotAcknowledgedPolicies(
    viewer.id,
    baseLegalPolicies,
  );

  let initialNavInfo;
  try {
    initialNavInfo = navInfoFromURL(req.url, {
      now: currentDateInTimeZone(viewer.timeZone),
    });
  } catch (e) {
    throw new ServerError(e.message);
  }

  let navInfoUserInfoPromise;
  if (
    viewer.loggedIn &&
    initialNavInfo.tab === 'chat' &&
    initialNavInfo.chatMode === 'create' &&
    initialNavInfo.selectedUserList &&
    initialNavInfo.selectedUserList.length > 0
  ) {
    const userIDs = initialNavInfo.selectedUserList;
    navInfoUserInfoPromise = (async () => {
      const userInfos = {};
      const fetchedUserInfos = await fetchUserInfos(userIDs);
      for (const userID in fetchedUserInfos) {
        const userInfo = fetchedUserInfos[userID];
        if (userInfo.username) {
          userInfos[userID] = userInfo;
        }
      }
      return userInfos;
    })();
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
  const knownUserInfoPromise = fetchKnownUserInfos(viewer);

  const sessionIDPromise = (async () => {
    if (viewer.loggedIn) {
      await setNewSession(viewer, calendarQuery, initialTime);
    }
    return viewer.sessionID;
  })();

  const threadStorePromise = (async () => {
    const [{ threadInfos }, hasNotAcknowledgedPolicies] = await Promise.all([
      threadInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return { threadInfos: hasNotAcknowledgedPolicies ? {} : threadInfos };
  })();
  const messageStorePromise = (async () => {
    const [
      { threadInfos },
      { rawMessageInfos, truncationStatuses },
      hasNotAcknowledgedPolicies,
    ] = await Promise.all([
      threadInfoPromise,
      messageInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    if (hasNotAcknowledgedPolicies) {
      return {
        messages: {},
        threads: {},
        local: {},
        currentAsOf: 0,
      };
    }
    const { messageStore: freshStore } = freshMessageStore(
      rawMessageInfos,
      truncationStatuses,
      mostRecentMessageTimestamp(rawMessageInfos, initialTime),
      threadInfos,
    );
    return freshStore;
  })();
  const entryStorePromise = (async () => {
    const [{ rawEntryInfos }, hasNotAcknowledgedPolicies] = await Promise.all([
      entryInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    if (hasNotAcknowledgedPolicies) {
      return {
        entryInfos: {},
        daysToEntries: {},
        lastUserInteractionCalendar: 0,
      };
    }
    return {
      entryInfos: _keyBy('id')(rawEntryInfos),
      daysToEntries: daysToEntriesFromEntryInfos(rawEntryInfos),
      lastUserInteractionCalendar: initialTime,
    };
  })();
  const userStorePromise = (async () => {
    const [knownUserInfos, hasNotAcknowledgedPolicies, navInfoUserInfos] =
      await Promise.all([
        knownUserInfoPromise,
        hasNotAcknowledgedPoliciesPromise,
        navInfoUserInfoPromise,
      ]);
    return {
      userInfos: hasNotAcknowledgedPolicies
        ? {}
        : { ...navInfoUserInfos, ...knownUserInfos },
      inconsistencyReports: [],
    };
  })();

  const navInfoPromise = (async () => {
    const [{ threadInfos }, messageStore, currentUserInfo, userStore] =
      await Promise.all([
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
        const members = [...pendingThreadData.memberIDs, currentUserInfo.id]
          .map(id => {
            const userInfo = userInfos[id];
            if (!userInfo || !userInfo.username) {
              return undefined;
            }
            const { username } = userInfo;
            return { id, username };
          })
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
  const currentAsOfPromise = (async () => {
    const hasNotAcknowledgedPolicies = await hasNotAcknowledgedPoliciesPromise;
    return hasNotAcknowledgedPolicies ? 0 : initialTime;
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
    updatesCurrentAsOf: currentAsOfPromise,
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
    primaryIdentityPublicKey: null,
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
