// @flow

import { detect as detectBrowser } from 'detect-browser';
import type { $Response, $Request } from 'express';

import stores from 'lib/facts/stores.js';

const inviteSecretRegex = /^[a-z0-9]+$/i;

function deepLinkResponder(req: $Request, res: $Response) {
  const { secret } = req.params;
  const userAgent = req.get('User-Agent');
  const detectionResult = detectBrowser(userAgent);
  let redirectUrl = stores.appStoreUrl;
  if (detectionResult.os === 'Android OS') {
    const isSecretValid = inviteSecretRegex.test(secret);
    const referrer = isSecretValid
      ? `&referrer=${encodeURIComponent(`utm_source=invite/${secret}`)}`
      : '';
    redirectUrl = `${stores.googlePlayUrl}${referrer}`;
  }
  res.writeHead(301, {
    Location: redirectUrl,
  });
  res.end();
}

export { deepLinkResponder };
