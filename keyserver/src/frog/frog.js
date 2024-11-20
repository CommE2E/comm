// @flow

/** @jsxImportSource hono/jsx */

/* eslint-disable react/react-in-jsx-scope */

import { serve } from '@hono/node-server';
import { Button, Frog } from 'frog';

import { inviteLinkURL } from 'lib/facts/links.js';

function startFrogHonoServer() {
  const frogApp = new Frog({ title: 'Comm Frame' });

  frogApp.frame('/:inviteLink', c => {
    const { inviteLink } = c.req.param();

    let buttonLink = 'https://comm.app';
    const inviteLinkURLPrefix = inviteLinkURL('');

    if (inviteLink.startsWith(inviteLinkURLPrefix)) {
      buttonLink = inviteLink;
    }

    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Hello World!
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
