// @flow

/** @jsxImportSource hono/jsx */

/* eslint-disable react/react-in-jsx-scope */

import { serve } from '@hono/node-server';
import { Button, Frog } from 'frog';

function startFrogHonoServer() {
  const frogApp = new Frog({ title: 'Comm Frame App' });

  frogApp.frame('/', c => {
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Hello World!
        </div>
      ),
      intents: [
        <Button key="invite" value="Invite Link">
          Join chat
        </Button>,
      ],
    });
  });

  serve({
    fetch: frogApp.fetch,
    port: parseInt(process.env.FROG_PORT, 10) || 3001,
  });
}

export { startFrogHonoServer };
