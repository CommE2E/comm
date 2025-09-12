// @flow

import html from 'common-tags/lib/html/index.js';
import { detect as detectBrowser } from 'detect-browser';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import * as React from 'react';
// eslint-disable-next-line import/extensions
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import stores from 'lib/facts/stores.js';
import { inviteSecretRegex } from 'lib/shared/invite-links-constants.js';
import getTitle from 'web/title/get-title.js';

import {
  getAndAssertKeyserverURLFacts,
  getAppURLFactsFromRequestURL,
  getWebAppURLFacts,
} from '../utils/urls.js';

const { renderToPipeableStream } = ReactDOMServer;

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
  +commQueryExecutorFilename: string,
  +backupClientFilename: string,
  +webworkersOpaqueFilename: string,
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
      commQueryExecutorFilename: '',
      backupClientFilename: '',
      webworkersOpaqueFilename: '',
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
      commQueryExecutorFilename: webworkersManifest['comm_query_executor.wasm'],
      backupClientFilename: webworkersManifest['backup-client-wasm_bg.wasm'],
      webworkersOpaqueFilename: webworkersManifest['comm_opaque2_wasm_bg.wasm'],
    };
    return assetInfo;
  } catch (e) {
    console.warn(e);
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
  } catch (e) {
    console.warn(e);
    throw new Error(
      'Could not load app.build.cjs. ' +
        'Did you forget to run `yarn dev` in the web folder?',
    );
  }
}

function stripLastSlash(input: string): string {
  return input.replace(/\/$/, '');
}

async function websiteResponder(req: $Request, res: $Response): Promise<void> {
  const { basePath } = getAppURLFactsFromRequestURL(req.originalUrl);
  const baseURL = stripLastSlash(basePath);

  const keyserverURLFacts = getAndAssertKeyserverURLFacts();
  const keyserverURL = `${keyserverURLFacts.baseDomain}${stripLastSlash(
    keyserverURLFacts.basePath,
  )}`;

  const loadingPromise = getWebpackCompiledRootComponentForSSR();

  const assetInfoPromise = getAssetInfo();
  const {
    jsURL,
    fontsURL,
    cssInclude,
    olmFilename,
    commQueryExecutorFilename,
    backupClientFilename,
    webworkersOpaqueFilename,
  } = await assetInfoPromise;

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
  await new Promise<void>((resolve, reject) => {
    const {
      pipe,
    }: {
      +pipe: (
        destination: $Response,
        options?: { +end?: boolean, ... },
      ) => void,
      ...
    } = renderToPipeableStream(<Loading />, {
      onShellReady() {
        pipe(res, { end: false });
      },
      onAllReady() {
        resolve();
      },
      onError(error) {
        reject(error);
      },
    });
  });
  res.end(html`
    </div>
    <script>
          var keyserverURL = "${keyserverURL}";
          var baseURL = "${baseURL}";
          var olmFilename = "${olmFilename}";
          var commQueryExecutorFilename = "${commQueryExecutorFilename}";
          var backupClientFilename = "${backupClientFilename}";
          var webworkersOpaqueFilename = "${webworkersOpaqueFilename}"
        </script>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
}

// On native, if this responder is called, it means that the app isn't
// installed.
async function inviteResponder(req: $Request, res: $Response): Promise<void> {
  const { secret } = req.params;
  const userAgent = req.get('User-Agent');
  const detectionResult = detectBrowser(userAgent);
  if (detectionResult?.os === 'Android OS') {
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
  } else if (detectionResult?.os !== 'iOS') {
    const urlFacts = getWebAppURLFacts();
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
    <!doctype html>
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
            font-family:
              'Inter',
              -apple-system,
              'Segoe UI',
              'Roboto',
              'Oxygen',
              'Ubuntu',
              'Cantarell',
              'Fira Sans',
              'Droid Sans',
              'Helvetica Neue',
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
            <a class="button secondary" href="comm://invite/${secret}">
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
