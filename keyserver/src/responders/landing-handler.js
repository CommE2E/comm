// @flow

import html from 'common-tags/lib/html';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import * as React from 'react';
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import { type LandingSSRProps } from '../landing/landing-ssr.react';
import { waitForStream } from '../utils/json-stream';
import {
  getAndAssertLandingURLFacts,
  clientPathFromRouterPath,
} from '../utils/urls';
import { getMessageForException } from './utils';

async function landingHandler(req: $Request, res: $Response) {
  try {
    await landingResponder(req, res);
  } catch (e) {
    console.warn(e);
    if (!res.headersSent) {
      res.status(500).send(getMessageForException(e));
    }
  }
}

const access = promisify(fs.access);
const googleFontsURL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500&display=swap';
const iaDuoFontsURL = 'fonts/duo.css';
const localFontsURL = 'fonts/local-fonts.css';
async function getDevFontURLs(): Promise<$ReadOnlyArray<string>> {
  try {
    await access(localFontsURL);
    return [localFontsURL, iaDuoFontsURL];
  } catch {
    return [googleFontsURL, iaDuoFontsURL];
  }
}

type AssetInfo = {
  +jsURL: string,
  +fontURLs: $ReadOnlyArray<string>,
  +cssInclude: string,
};
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === 'development') {
    const fontURLs = await getDevFontURLs();
    assetInfo = {
      jsURL: 'http://localhost:8082/dev.build.js',
      fontURLs,
      cssInclude: '',
    };
    return assetInfo;
  }
  try {
    // $FlowFixMe landing/dist doesn't always exist
    const { default: assets } = await import('landing/dist/assets');
    assetInfo = {
      jsURL: `compiled/${assets.browser.js}`,
      fontURLs: [googleFontsURL, iaDuoFontsURL],
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
      'Could not load assets.json for landing build. ' +
        'Did you forget to run `yarn dev` in the landing folder?',
    );
  }
}

type LandingApp = React.ComponentType<LandingSSRProps>;
let webpackCompiledRootComponent: ?LandingApp = null;
async function getWebpackCompiledRootComponentForSSR() {
  if (webpackCompiledRootComponent) {
    return webpackCompiledRootComponent;
  }
  try {
    // $FlowFixMe landing/dist doesn't always exist
    const webpackBuild = await import('landing/dist/landing.build.cjs');
    webpackCompiledRootComponent = webpackBuild.default.default;
    return webpackCompiledRootComponent;
  } catch {
    throw new Error(
      'Could not load landing.build.cjs. ' +
        'Did you forget to run `yarn dev` in the landing folder?',
    );
  }
}

const { renderToNodeStream } = ReactDOMServer;

async function landingResponder(req: $Request, res: $Response) {
  const [{ jsURL, fontURLs, cssInclude }, LandingSSR] = await Promise.all([
    getAssetInfo(),
    getWebpackCompiledRootComponentForSSR(),
  ]);

  const fontsInclude = fontURLs
    .map(url => `<link rel="stylesheet" type="text/css" href="${url}" />`)
    .join('');

  const urlFacts = getAndAssertLandingURLFacts();
  const { basePath } = urlFacts;

  // prettier-ignore
  res.write(html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <meta property="og:url" content="https://comm.app/" />
        <meta property="og:title" content="Comm" />
        <meta property="og:description" content="Crypto-native messaging based on federated keyservers" />
        <meta property="og:image" content="https://comm.app/landing-favicon-32x32.png" />
        <meta property="og:image:alt" content="Comm logo" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@CommDotApp" />
        <title>Comm</title>
        <base href="${basePath}" />
        ${fontsInclude}
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
          href="landing-favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="landing-favicon-16x16.png"
        />
      </head>
      <body>
        <div id="react-root">
  `);

  // We remove trailing slash for `react-router`
  const routerBasename = basePath.replace(/\/$/, '');
  const clientPath = clientPathFromRouterPath(req.url, urlFacts);
  const reactStream = renderToNodeStream(
    <LandingSSR url={clientPath} basename={routerBasename} />,
  );
  reactStream.pipe(res, { end: false });
  await waitForStream(reactStream);

  // prettier-ignore
  res.end(html`</div>
        <script>var routerBasename = "${routerBasename}";</script>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
}

export default landingHandler;
