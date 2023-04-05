// @flow

import { html } from 'common-tags';
import { detect as detectBrowser } from 'detect-browser';
import type { $Response, $Request } from 'express';

import stores from 'lib/facts/stores.js';

const inviteSecretRegex = /^[a-z0-9]+$/i;

async function deepLinkResponder(req: $Request, res: $Response) {
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
    res.end(html`
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Comm</title>
          <style>
            * {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
            }

            body {
              background-color: #0a0a0a;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              height: 100%;
              padding: 24px;
              font-size: 1.6rem;
              line-height: 1.5;
            }

            section {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              gap: 16px;
            }

            h1 {
              font-size: 3.2rem;
              line-height: 1.3;
              margin-top: 32px;
            }

            .community {
              background-color: #1f1f1f;
              padding: 32px;
              border-radius: 12px;
            }

            a {
              all: unset;
              box-sizing: border-box;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              padding: 24px;
              border-radius: 4px;
              border: 1px solid transparent;
              background-color: #7e57c2;
            }

            a.secondary {
              background-color: #0a0a0a;
              border-color: #808080;
            }
          </style>
        </head>
        <body>
          <section>
            <h1>Comm</h1>
            <p>
              To join this community, download the Comm app and reopen this
              invite link
            </p>
          </section>
          <section class="community">Community Details</section>
          <section>
            <a href="${stores.appStoreUrl}">Download Comm</a>
            <a class="secondary" href="/invite/${secret}">Invite Link</a>
          </section>
        </body>
      </html>
    `);
  }
}

export { deepLinkResponder };
