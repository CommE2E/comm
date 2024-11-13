// @flow

/** @jsxImportSource hono/jsx */

import { serve } from '@hono/node-server';
import { Button, Frog } from 'frog';

function setUpFrog() {
  const frogApp = new Frog({ title: 'frog app' });

  frogApp.frame('/', c => {
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Hello World!
        </div>
      ),
      intents: [
        <Button key="invite" value="Invite Link">
          Invite Link
        </Button>,
      ],
    });
  });

  serve({
    fetch: frogApp.fetch,
    port: parseInt(process.env.FROG_PORT, 10) || 3001,
  });
}

export { setUpFrog };
