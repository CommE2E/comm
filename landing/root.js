// @flow

import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';

import Landing from './landing.react';
import { SIWENonceContext } from './siwe-nonce-context.js';

declare var routerBasename: string;
declare var siweNonce: ?string;

function RootComponent(): React.Node {
  const siweNonceContextValue = React.useMemo(
    () => ({
      siweNonce,
    }),
    [],
  );
  return (
    <BrowserRouter basename={routerBasename}>
      <SIWENonceContext.Provider value={siweNonceContextValue}>
        <Landing />
      </SIWENonceContext.Provider>
    </BrowserRouter>
  );
}

export default RootComponent;
