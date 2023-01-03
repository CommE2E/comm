// @flow

import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';

import Landing from './landing.react';
import { SIWEContext } from './siwe-context.js';

declare var routerBasename: string;
declare var siweNonce: ?string;
declare var siwePrimaryIdentityPublicKey: ?string;

function RootComponent(): React.Node {
  const siweContextValue = React.useMemo(
    () => ({
      siweNonce,
      siwePrimaryIdentityPublicKey,
    }),
    [],
  );
  return (
    <BrowserRouter basename={routerBasename}>
      <SIWEContext.Provider value={siweContextValue}>
        <Landing />
      </SIWEContext.Provider>
    </BrowserRouter>
  );
}

export default RootComponent;
