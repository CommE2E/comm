// @flow

import html from 'common-tags/lib/html';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import * as React from 'react';
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import { type LandingSSRProps } from '../landing/landing-ssr.react';
import { waitForStream } from '../utils/json-stream';
import { getLandingURLFacts } from '../utils/urls';
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
const localFontsURL = 'fonts/local-fonts.css';
async function getFontsURL() {
  try {
    await access(localFontsURL);
    return localFontsURL;
  } catch {
    return googleFontsURL;
  }
}

type AssetInfo = {| +jsURL: string, +fontsURL: string, +cssInclude: string |};
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === 'development') {
    const fontsURL = await getFontsURL();
    assetInfo = {
      jsURL: 'http://localhost:8082/dev.build.js',
      fontsURL,
      cssInclude: '',
    };
    return assetInfo;
  }
  // $FlowFixMe landing/dist doesn't always exist
  const { default: assets } = await import('landing/dist/assets');
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

const { basePath } = getLandingURLFacts();
const { renderToNodeStream } = ReactDOMServer;

async function landingResponder(req: $Request, res: $Response) {
  const [{ jsURL, fontsURL, cssInclude }, LandingSSR] = await Promise.all([
    getAssetInfo(),
    getWebpackCompiledRootComponentForSSR(),
  ]);

  // prettier-ignore
  res.write(html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Comm</title>
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
  const reactStream = renderToNodeStream(
    <LandingSSR url={req.url} basename={routerBasename} />,
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
