// @flow

/** @jsxImportSource hono/jsx */

/* eslint-disable react/react-in-jsx-scope */

import { serve } from '@hono/node-server';
import { Button, Frog } from 'frog';

import { inviteLinkURL } from 'lib/facts/links.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';

import { neynarClient } from '../utils/fc-cache.js';
import { redisCache } from '../utils/redis-cache.js';

function startFrogHonoServer() {
  const frogApp = new Frog({ title: 'Comm' });

  frogApp.frame('/:inviteLink/:channelID', async c => {
    const { inviteLink, channelID } = c.req.param();

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

    let header_image_url =
      'https://warpcast.com/~/images/DefaultChannelCoverImage.png';
    if (channelInfo?.header_image_url) {
      header_image_url = channelInfo.header_image_url;
    }

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
    port: parseInt(process.env.FROG_PORT, 10) || 3001,
  });
}

export { startFrogHonoServer };
