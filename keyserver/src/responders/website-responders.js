// @flow

import html from 'common-tags/lib/html/index.js';
import { detect as detectBrowser } from 'detect-browser';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import _keyBy from 'lodash/fp/keyBy.js';
import * as React from 'react';
// eslint-disable-next-line import/extensions
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import { baseLegalPolicies } from 'lib/facts/policies.js';
import stores from 'lib/facts/stores.js';
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
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import getTitle from 'web/title/getTitle.js';
import { navInfoFromURL } from 'web/url-utils.js';

import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { hasAnyNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers.js';
import { getWebPushConfig } from '../push/providers.js';
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

type AssetInfo = {
  +jsURL: string,
  +fontsURL: string,
  +cssInclude: string,
  +olmFilename: string,
  +sqljsFilename: string,
  +opaqueURL: string,
};
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
      olmFilename: '',
      sqljsFilename: '',
      opaqueURL: 'http://localhost:8080/opaque-ke.wasm',
    };
    return assetInfo;
  }
  try {
    const manifestString = await readFile('../web/dist/manifest.json', 'utf8');
    const manifest = JSON.parse(manifestString);
    const webworkersManifestString = await readFile(
      '../web/dist/webworkers/manifest.json',
      'utf8',
    );
    const webworkersManifest = JSON.parse(webworkersManifestString);
    assetInfo = {
      jsURL: `compiled/${manifest['browser.js']}`,
      fontsURL: googleFontsURL,
      cssInclude: html`
        <link
          rel="stylesheet"
          type="text/css"
          href="compiled/${manifest['browser.css']}"
        />
      `,
      olmFilename: manifest['olm.wasm'],
      sqljsFilename: webworkersManifest['sql-wasm.wasm'],
      opaqueURL: `compiled/${manifest['comm_opaque2_wasm_bg.wasm']}`,
    };
    return assetInfo;
  } catch {
    throw new Error(
      'Could not load manifest.json for web build. ' +
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
    const [userInfos, hasNotAcknowledgedPolicies] = await Promise.all([
      userInfoPromise,
      hasNotAcknowledgedPoliciesPromise,
    ]);
    return {
      userInfos: hasNotAcknowledgedPolicies ? {} : userInfos,
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

  const pushApiPublicKeyPromise = (async () => {
    const pushConfig = await getWebPushConfig();
    if (!pushConfig) {
      if (process.env.NODE_ENV !== 'development') {
        console.warn('keyserver/secrets/web_push_config.json should exist');
      }
      return null;
    }
    return pushConfig.publicKey;
  })();

  const { jsURL, fontsURL, cssInclude, olmFilename, sqljsFilename, opaqueURL } =
    await assetInfoPromise;

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
    notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
    connection: {
      ...defaultConnectionInfo(viewer.platform ?? 'web', viewer.timeZone),
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
    deviceToken: null,
    dataLoaded: viewer.loggedIn,
    windowActive: true,
    userPolicies: {},
    cryptoStore: {
      primaryIdentityKeys: null,
      notificationIdentityKeys: null,
    },
    pushApiPublicKey: pushApiPublicKeyPromise,
    _persist: null,
    commServicesAccessToken: null,
  });
  const jsonStream = streamJSON(res, initialReduxState);

  await waitForStream(jsonStream);
  res.end(html`
    ;
          var baseURL = "${baseURL}";
          var olmFilename = "${olmFilename}";
          var sqljsFilename = "${sqljsFilename}";
          var opaqueURL = "${opaqueURL}";
        </script>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
}

const inviteSecretRegex = /^[a-z0-9]+$/i;

async function inviteResponder(req: $Request, res: $Response): Promise<void> {
  const { secret } = req.params;
  const userAgent = req.get('User-Agent');
  const detectionResult = detectBrowser(userAgent);
  if (detectionResult.os === 'Android OS') {
    const isSecretValid = inviteSecretRegex.test(secret);
    const referrer = isSecretValid
      ? `&referrer=${encodeURIComponent(`utm_source=invite/${secret}`)}`
      : '';
    const redirectUrl = `${stores.googlePlayUrl}${referrer}`;
    res.writeHead(301, {
      Location: redirectUrl,
    });
    res.end();
  } else {
    const fontsURL = await getFontsURL();
    res.end(html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Comm</title>
          <link rel="stylesheet" type="text/css" href="/${fontsURL}" />
          <style>
            * {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
            }

            html {
              height: 100%;
            }

            body {
              font-family: 'Inter', -apple-system, 'Segoe UI', 'Roboto',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', ui-sans-serif;
              background: #0a0a0a url('/images/invite_link_background.png')
                no-repeat;
              background-size: cover;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-around;
              align-items: center;
              height: 100%;
              padding: 1.6rem;
              font-size: 1.8rem;
              line-height: 2.4rem;
              font-weight: 500;
            }

            section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              width: 100%;
            }

            .card {
              width: 100%;
              padding: 3.2rem 1.2rem;
              gap: 4rem;
              background-color: #1f1f1f;
              border-radius: 1.6rem;
            }

            .buttons {
              gap: 1.2rem;
            }

            h1 {
              font-size: 3.6rem;
              line-height: 1.5;
              font-weight: 500;
              font-family: 'IBM Plex Sans', sans-serif;
            }

            p {
              text-align: center;
            }

            .separator {
              border: 1px solid #404040;
              width: 100%;
            }

            .button {
              all: unset;
              box-sizing: border-box;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              padding: 1.7rem;
              border-radius: 0.4rem;
              border: 1px solid transparent;
              background-color: #6d49ab;
              font-size: 1.6rem;
              line-height: 1.5;
            }

            .button.secondary {
              background-color: #1f1f1f;
              border-color: #ffffff;
            }

            .link {
              all: unset;
              box-sizing: border-box;
              text-decoration-line: underline;
            }

            .logo-container {
              background-color: #0a0a0a;
              width: 4.2rem;
              height: 4.2rem;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 50%;
            }

            .logo {
              height: 2.6rem;
            }
          </style>
        </head>
        <body>
          <div></div>
          <section class="card">
            <section>
              <div class="logo-container">
                <img
                  src="/images/loading_logo.svg"
                  alt="Comm logo"
                  class="logo"
                />
              </div>
              <h1>Comm</h1>
            </section>
            <p>
              To join this community, download the Comm app and reopen this
              invite link
            </p>
            <div class="separator"></div>
            <section class="buttons">
              <a class="button" href="${stores.appStoreUrl}">Download Comm</a>
              <a class="button secondary" href="/invite/${secret}">
                Invite Link
              </a>
            </section>
          </section>
          <a class="link" href="https://comm.app/">Visit Comm’s website</a>
        </body>
      </html>
    `);
  }
}

export { websiteResponder, inviteResponder };
