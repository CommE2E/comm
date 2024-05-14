// @flow

import * as React from 'react';
import { StaticRouter } from 'react-router';

import { type SIWEMessageType } from 'lib/types/siwe-types.js';

import Landing from './landing.react.js';
import { SIWEContext } from './siwe-context.js';

export type LandingSSRProps = {
  +url: string,
  +basename: string,
  +siweNonce: ?string,
  +siwePrimaryIdentityPublicKey: ?string,
  +siweMessageType: ?SIWEMessageType,
  +siweMessageToSign: ?string,
};
function LandingSSR(props: LandingSSRProps): React.Node {
  const {
    url,
    basename,
    siweNonce,
    siwePrimaryIdentityPublicKey,
    siweMessageType,
    siweMessageToSign,
  } = props;

  const siweContextValue = React.useMemo(
    () => ({
      siweNonce,
      siwePrimaryIdentityPublicKey,
      siweMessageType,
      siweMessageToSign,
    }),
    [
      siweNonce,
      siwePrimaryIdentityPublicKey,
      siweMessageType,
      siweMessageToSign,
    ],
  );
  const routerContext = React.useMemo(() => ({}), []);
  return (
    <StaticRouter location={url} basename={basename} context={routerContext}>
      <SIWEContext.Provider value={siweContextValue}>
        <Landing />
      </SIWEContext.Provider>
    </StaticRouter>
  );
}

export default LandingSSR;
