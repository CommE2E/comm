// @flow

import * as React from 'react';
import { StaticRouter } from 'react-router';

import Landing from './landing.react.js';
import { SIWEContext } from './siwe-context.js';

export type LandingSSRProps = {
  +url: string,
  +basename: string,
  +siweNonce: ?string,
  +siwePrimaryIdentityPublicKey: ?string,
  +siweMessageType: ?string,
};
function LandingSSR(props: LandingSSRProps): React.Node {
  const {
    url,
    basename,
    siweNonce,
    siwePrimaryIdentityPublicKey,
    siweMessageType,
  } = props;

  const siweContextValue = React.useMemo(
    () => ({
      siweNonce,
      siwePrimaryIdentityPublicKey,
      siweMessageType,
    }),
    [siweNonce, siwePrimaryIdentityPublicKey, siweMessageType],
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
