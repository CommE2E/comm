// @flow

import * as React from 'react';
import { StaticRouter } from 'react-router';

import Landing from './landing.react';
import { SIWENonceContext } from './siwe-nonce-context';

export type LandingSSRProps = {
  +url: string,
  +basename: string,
  +siweNonce: ?string,
};
function LandingSSR(props: LandingSSRProps): React.Node {
  const { url, basename, siweNonce } = props;

  const siweNonceContextValue = React.useMemo(
    () => ({
      siweNonce,
    }),
    [siweNonce],
  );
  const routerContext = React.useMemo(() => ({}), []);
  return (
    <StaticRouter location={url} basename={basename} context={routerContext}>
      <SIWENonceContext.Provider value={siweNonceContextValue}>
        <Landing />
      </SIWENonceContext.Provider>
    </StaticRouter>
  );
}

export default LandingSSR;
