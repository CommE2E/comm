// @flow

import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { type SIWEMessageType } from 'lib/types/siwe-types.js';

import Landing from './landing.react.js';
import { SIWEContext } from './siwe-context.js';

declare var routerBasename: string;
declare var siweNonce: ?string;
declare var siwePrimaryIdentityPublicKey: ?string;
declare var siweMessageType: ?SIWEMessageType;
declare var siweMessageIssuedAt: ?string;

function RootComponent(): React.Node {
  const siweContextValue = React.useMemo(
    () => ({
      siweNonce,
      siwePrimaryIdentityPublicKey,
      siweMessageType,
      siweMessageIssuedAt,
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
