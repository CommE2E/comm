// @flow
/** @jsxImportSource hono/jsx */

/* eslint-disable react/react-in-jsx-scope */

import { serve } from '@hono/node-server';
// eslint-disable-next-line import/extensions
import { serveStatic } from '@hono/node-server/serve-static';
import { Button, Frog } from 'frog';
// eslint-disable-next-line import/extensions
import { cors } from 'hono/cors';

import { inviteLinkURL } from 'lib/facts/links.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';

import { neynarClient } from '../utils/fc-cache.js';
import { redisCache } from '../utils/redis-cache.js';
import { getKeyserverURLFacts } from '../utils/urls.js';

const keyserverURLFacts = getKeyserverURLFacts();
const frogHonoPort: number = parseInt(process.env.FROG_HONO_PORT, 10) || 3001;
const frogHonoURL: string = (() => {
  if (process.env.FROG_HONO_URL) {
    return process.env.FROG_HONO_URL;
  } else {
    return `http://localhost:${frogHonoPort}`;
  }
})();

function startFrogHonoServer() {
  const frogApp = new Frog({
    title: 'Comm',
    // Mirrors the express server's reverse proxy path so that
    // frog constructs URLs with the correct path in the HTML response,
    // ensuring frame requests are forwarded to the frog hono server.
    basePath: `${keyserverURLFacts?.baseRoutePath ?? '/'}frog/`,
  });

  frogApp.hono.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET'],
    }),
  );

  frogApp.hono.use(
    '/default_farcaster_channel_cover.png',
    serveStatic({ path: './images/default_farcaster_channel_cover.png' }),
  );

  frogApp.frame('/:inviteLink/:channelID/:taggerUsername', async c => {
    const { inviteLink, channelID, taggerUsername } = c.req.param();

    let buttonLink = 'https://comm.app';
    const inviteLinkURLPrefix = inviteLinkURL('');

    if (inviteLink.startsWith(inviteLinkURLPrefix)) {
      buttonLink = inviteLink;
    }

    let channelInfo = await redisCache.getChannelInfo(channelID);
    if (!channelInfo) {
      channelInfo = await neynarClient?.fetchFarcasterChannelByID(channelID);

      if (channelInfo) {
        ignorePromiseRejections(
          redisCache.setChannelInfo(channelID, channelInfo),
        );
      }
    }

    let header_image_url = '/default_farcaster_channel_cover.png';
    if (channelInfo?.header_image_url) {
      header_image_url = channelInfo.header_image_url;
    }

    const displayUsername =
      taggerUsername.length > 16
        ? `${taggerUsername.slice(0, 16)}[...]`
        : taggerUsername;

    const channelIcon = channelInfo?.image_url ? (
      <img
        src={channelInfo.image_url}
        alt="icon"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          marginRight: '15px',
        }}
      />
    ) : null;

    return c.res({
      image: (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={header_image_url}
            alt="frame background"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              minWidth: '55%',
              width: 'auto',
              height: '37%',
              position: 'absolute',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '40px',
              padding: '20px 40px',
              border: '4px solid white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '80%',
              }}
            >
              {channelIcon}
              <span
                style={{
                  color: 'white',
                  fontSize: '32px',
                  weight: '500',
                  textAlign: 'center',
                }}
              >
                Thread Invitation
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '20%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'white', weight: '500', fontSize: '32px' }}>
                @{displayUsername} created a thread on Comm
              </span>
            </div>
          </div>
        </div>
      ),
      intents: [
        <Button.Link key="invite" href={buttonLink}>
          Join chat
        </Button.Link>,
      ],
    });
  });

  serve({
    fetch: frogApp.fetch,
    port: frogHonoPort,
  });
}

export { startFrogHonoServer, frogHonoURL };
