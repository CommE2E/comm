// @flow

import html from 'common-tags/lib/html/index.js';
import { detect as detectBrowser } from 'detect-browser';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import _isEqual from 'lodash/fp/isEqual.js';
import _keyBy from 'lodash/fp/keyBy.js';
import * as React from 'react';
// eslint-disable-next-line import/extensions
import ReactDOMServer from 'react-dom/server';
import t from 'tcomb';
import { promisify } from 'util';

import { inviteLinkUrl } from 'lib/facts/links.js';
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
import { entryStoreValidator } from 'lib/types/entry-types.js';
import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { inviteLinksStoreValidator } from 'lib/types/link-types.js';
import {
  defaultNumberPerThread,
  messageStoreValidator,
} from 'lib/types/message-types.js';
import { defaultEnabledReports } from 'lib/types/report-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { threadStoreValidator } from 'lib/types/thread-types.js';
import {
  currentUserInfoValidator,
  userInfosValidator,
} from 'lib/types/user-types.js';
import { currentDateInTimeZone } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';
import { defaultNotifPermissionAlertInfo } from 'lib/utils/push-alerts.js';
import { infoFromURL } from 'lib/utils/url-utils.js';
import { tBool, tNumber, tShape, tString } from 'lib/utils/validation-utils.js';
import getTitle from 'web/title/getTitle.js';
import { navInfoValidator } from 'web/types/nav-types.js';
import { navInfoFromURL } from 'web/url-utils.js';

import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { hasAnyNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchCurrentUserInfo,
  fetchKnownUserInfos,
  fetchUserInfos,
} from '../fetchers/user-fetchers.js';
import { getWebPushConfig } from '../push/providers.js';
import { setNewSession } from '../session/cookies.js';
import { Viewer } from '../session/viewer.js';
import { streamJSON, waitForStream } from '../utils/json-stream.js';
import {
  getAppURLFactsFromRequestURL,
  getCommAppURLFacts,
} from '../utils/urls.js';
import { validateOutput } from '../utils/validation-utils.js';

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

const initialReduxStateValidator = tShape({
  navInfo: navInfoValidator,
  deviceID: t.Nil,
  currentUserInfo: currentUserInfoValidator,
  draftStore: t.irreducible('default draftStore', _isEqual({ drafts: {} })),
  sessionID: t.maybe(t.String),
  entryStore: entryStoreValidator,
  threadStore: threadStoreValidator,
  userStore: tShape({
    userInfos: userInfosValidator,
    inconsistencyReports: t.irreducible(
      'default inconsistencyReports',
      _isEqual([]),
    ),
  }),
  messageStore: messageStoreValidator,
  updatesCurrentAsOf: t.Number,
  loadingStatuses: t.irreducible('default loadingStatuses', _isEqual({})),
  calendarFilters: t.irreducible(
    'defaultCalendarFilters',
    _isEqual(defaultCalendarFilters),
  ),
  communityPickerStore: t.irreducible(
    'default communityPickerStore',
    _isEqual({ chat: null, calendar: null }),
  ),
  urlPrefix: tString(''),
  windowDimensions: t.irreducible(
    'default windowDimensions',
    _isEqual({ width: 0, height: 0 }),
  ),
  baseHref: t.String,
  notifPermissionAlertInfo: t.irreducible(
    'default notifPermissionAlertInfo',
    _isEqual(defaultNotifPermissionAlertInfo),
  ),
  connection: tShape({
    status: tString('connecting'),
    queuedActivityUpdates: t.irreducible(
      'default queuedActivityUpdates',
      _isEqual([]),
    ),
    actualizedCalendarQuery: tShape({
      startDate: t.String,
      endDate: t.String,
      filters: t.irreducible(
        'default filters',
        _isEqual(defaultCalendarFilters),
      ),
    }),
    lateResponses: t.irreducible('default lateResponses', _isEqual([])),
    showDisconnectedBar: tBool(false),
  }),
  watchedThreadIDs: t.irreducible('default watchedThreadIDs', _isEqual([])),
  lifecycleState: tString('active'),
  enabledApps: t.irreducible(
    'defaultWebEnabledApps',
    _isEqual(defaultWebEnabledApps),
  ),
  reportStore: t.irreducible(
    'default reportStore',
    _isEqual({
      enabledReports: defaultEnabledReports,
      queuedReports: [],
    }),
  ),
  nextLocalID: tNumber(0),
  cookie: t.Nil,
  deviceToken: t.Nil,
  dataLoaded: t.Boolean,
  windowActive: tBool(true),
  userPolicies: t.irreducible('default userPolicies', _isEqual({})),
  cryptoStore: t.irreducible(
    'default cryptoStore',
    _isEqual({
      primaryIdentityKeys: null,
      notificationIdentityKeys: null,
    }),
  ),
  pushApiPublicKey: t.maybe(t.String),
  _persist: t.Nil,
  commServicesAccessToken: t.Nil,
  inviteLinksStore: inviteLinksStoreValidator,
  lastCommunicatedPlatformDetails: t.irreducible(
    'default lastCommunicatedPlatformDetails',
    _isEqual({}),
  ),
});

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

  const initialNavInfoPromise = (async () => {
    try {
      const urlInfo = infoFromURL(req.url);

      let backupInfo = {
        now: currentDateInTimeZone(viewer.timeZone),
      };
      // Some user ids in selectedUserList might not exist in the userStore
      // (e.g. they were included in the results of the user search endpoint)
      // Because of that we keep their userInfos inside the navInfo.
      if (urlInfo.selectedUserList) {
        const fetchedUserInfos = await fetchUserInfos(urlInfo.selectedUserList);
        const userInfos = {};
        for (const userID in fetchedUserInfos) {
          const userInfo = fetchedUserInfos[userID];
          if (userInfo.username) {
            userInfos[userID] = userInfo;
          }
        }
        backupInfo = { userInfos, ...backupInfo };
      }
      return navInfoFromURL(urlInfo, backupInfo);
    } catch (e) {
      throw new ServerError(e.message);
    }
  })();

  const calendarQueryPromise = (async () => {
    const initialNavInfo = await initialNavInfoPromise;
    return {
      startDate: initialNavInfo.startDate,
      endDate: initialNavInfo.endDate,
      filters: defaultCalendarFilters,
    };
  })();
  const messageSelectionCriteria = { joinedThreads: true };
  const initialTime = Date.now();

  const assetInfoPromise = getAssetInfo();
  const threadInfoPromise = fetchThreadInfos(viewer);
  const messageInfoPromise = fetchMessageInfos(
    viewer,
    messageSelectionCriteria,
    defaultNumberPerThread,
  );
  const entryInfoPromise = (async () => {
    const calendarQuery = await calendarQueryPromise;
    return await fetchEntryInfos(viewer, [calendarQuery]);
  })();
  const currentUserInfoPromise = fetchCurrentUserInfo(viewer);
  const userInfoPromise = fetchKnownUserInfos(viewer);

  const sessionIDPromise = (async () => {
    const calendarQuery = await calendarQueryPromise;
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
    const [
      { threadInfos },
      messageStore,
      currentUserInfo,
      userStore,
      finalNavInfo,
    ] = await Promise.all([
      threadInfoPromise,
      messageStorePromise,
      currentUserInfoPromise,
      userStorePromise,
      initialNavInfoPromise,
    ]);

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

  const inviteLinksStorePromise = (async () => {
    const primaryInviteLinks = await fetchPrimaryInviteLinks(viewer);
    const links = {};
    for (const link of primaryInviteLinks) {
      if (link.primary) {
        links[link.communityID] = {
          primaryLink: link,
        };
      }
    }
    return {
      links,
    };
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
    communityPickerStore: { chat: null, calendar: null },
    // We can use paths local to the <base href> on web
    urlPrefix: '',
    windowDimensions: { width: 0, height: 0 },
    baseHref,
    notifPermissionAlertInfo: defaultNotifPermissionAlertInfo,
    connection: (async () => ({
      ...defaultConnectionInfo(viewer.platform ?? 'web', viewer.timeZone),
      actualizedCalendarQuery: await calendarQueryPromise,
    }))(),
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
    inviteLinksStore: inviteLinksStorePromise,
    lastCommunicatedPlatformDetails: {},
  });
  const validatedInitialReduxState = validateOutput(
    viewer.platformDetails,
    initialReduxStateValidator,
    initialReduxState,
  );
  const jsonStream = streamJSON(res, validatedInitialReduxState);

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

// On native, if this responder is called, it means that the app isn't
// installed.
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
    return;
  } else if (detectionResult.os !== 'iOS') {
    const urlFacts = getCommAppURLFacts();
    const baseDomain = urlFacts?.baseDomain ?? '';
    const basePath = urlFacts?.basePath ?? '/';
    const redirectUrl = `${baseDomain}${basePath}handle/invite/${secret}`;
    res.writeHead(301, {
      Location: redirectUrl,
    });
    res.end();
    return;
  }
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
            font-size: 112.5%;
          }

          body {
            font-family: 'Inter', -apple-system, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              ui-sans-serif;
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
            padding: 3.2rem 1.6rem;
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
            display: flex;
            align-items: center;
          }

          .link-text {
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

          .arrow {
            width: 1.8rem;
            height: 1.8rem;
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
            To join this community, download the Comm app and reopen this invite
            link
          </p>
          <div class="separator"></div>
          <section class="buttons">
            <a class="button" href="${stores.appStoreUrl}">Download Comm</a>
            <a class="button secondary" href="${inviteLinkUrl(secret)}">
              Invite Link
            </a>
          </section>
        </section>
        <a class="link" href="https://comm.app/">
          <span class="link-text">Visit Comm’s website</span>
          <img
            src="/images/arrow_up_right.svg"
            alt="arrow up right"
            class="arrow"
          />
        </a>
      </body>
    </html>
  `);
}

export { websiteResponder, inviteResponder };
