// @flow

import html from 'common-tags/lib/html/index.js';
import type { $Response, $Request } from 'express';
import fs from 'fs';
import * as React from 'react';
// eslint-disable-next-line import/extensions
import ReactDOMServer from 'react-dom/server';
import { promisify } from 'util';

import {
  isValidPrimaryIdentityPublicKey,
  isValidSIWENonce,
} from 'lib/utils/siwe-utils.js';

import { getMessageForException } from './utils.js';
import { type LandingSSRProps } from '../landing/landing-ssr.react.js';
import { waitForStream } from '../utils/json-stream.js';
import { getAndAssertLandingURLFacts } from '../utils/urls.js';

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
const readFile = promisify(fs.readFile);

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
    const manifestString = await readFile(
      '../landing/dist/manifest.json',
      'utf8',
    );
    const manifest = JSON.parse(manifestString);
    assetInfo = {
      jsURL: `compiled/${manifest['browser.js']}`,
      fontURLs: [googleFontsURL, iaDuoFontsURL],
      cssInclude: html`
        <link
          rel="stylesheet"
          type="text/css"
          href="compiled/${manifest['browser.css']}"
        />
      `,
    };
    return assetInfo;
  } catch {
    throw new Error(
      'Could not load manifest.json for landing build. ' +
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
    webpackCompiledRootComponent = webpackBuild.landing.default;
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
  const siweNonce = req.header('siwe-nonce');
  if (
    siweNonce !== null &&
    siweNonce !== undefined &&
    !isValidSIWENonce(siweNonce)
  ) {
    res.status(400).send({
      message: 'Invalid nonce in siwe-nonce header.',
    });
    return;
  }
  const siwePrimaryIdentityPublicKey = req.header(
    'siwe-primary-identity-public-key',
  );
  if (
    siwePrimaryIdentityPublicKey !== null &&
    siwePrimaryIdentityPublicKey !== undefined &&
    !isValidPrimaryIdentityPublicKey(siwePrimaryIdentityPublicKey)
  ) {
    res.status(400).send({
      message:
        'Invalid primary identity public key in siwe-primary-identity-public-key header.',
    });
    return;
  }

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
  const clientPath = routerBasename + req.url;
  const reactStream = renderToNodeStream(
    <LandingSSR
      url={clientPath}
      basename={routerBasename}
      siweNonce={siweNonce}
      siwePrimaryIdentityPublicKey={siwePrimaryIdentityPublicKey}
    />,
  );
  reactStream.pipe(res, { end: false });
  await waitForStream(reactStream);

  const siweNonceString = siweNonce ? `"${siweNonce}"` : 'null';
  const siwePrimaryIdentityPublicKeyString = siwePrimaryIdentityPublicKey
    ? `"${siwePrimaryIdentityPublicKey}"`
    : 'null';
  // prettier-ignore
  res.end(html`</div>
        <script>var routerBasename = "${routerBasename}";</script>
        <script>var siweNonce = ${siweNonceString};</script>
        <script>var siwePrimaryIdentityPublicKey = ${siwePrimaryIdentityPublicKeyString};</script>
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
}

export default landingHandler;
