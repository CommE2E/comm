// @flow

import html from 'common-tags/lib/html';
import type { $Response, $Request } from 'express';

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

type AssetInfo = {| +jsURL: string |};
let assetInfo: ?AssetInfo = null;
async function getAssetInfo() {
  if (assetInfo) {
    return assetInfo;
  }
  if (process.env.NODE_ENV === 'dev') {
    assetInfo = {
      jsURL: 'http://localhost:8082/dev.build.js',
    };
    return assetInfo;
  }
  // $FlowFixMe landing_compiled/assets.json doesn't always exist
  const { default: assets } = await import('../../landing_compiled/assets');
  assetInfo = {
    jsURL: `compiled/${assets.browser.js}`,
  };
  return assetInfo;
}

const { basePath } = getLandingURLFacts();

async function landingResponder(req: $Request, res: $Response) {
  const { jsURL } = await getAssetInfo();
  // prettier-ignore
  res.end(html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Hello world</title>
        <base href="${basePath}" />
      </head>
      <body>
        <div id="react-root" />
        <script src="${jsURL}"></script>
      </body>
    </html>
  `);
}

export default landingHandler;
