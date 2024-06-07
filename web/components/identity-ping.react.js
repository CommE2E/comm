// @flow

import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';

function IdentityPing(): React.Node {
  const hasRun = React.useRef(false);
  const identityContext = React.useContext(IdentityClientContext);

  const ping = React.useCallback(async () => {
    try {
      if (!identityContext) {
        console.log('Identity context not available');
        return;
      }
      const identityClient = identityContext.identityClient;
      const pingCall = identityClient.ping;
      if (!pingCall) {
        console.log('Ping method unimplemented');
        return;
      }
      await pingCall();
      console.log('Identity ping successful');
    } catch (error) {
      console.log('Error pinging identity service:', error);
    }
  }, [identityContext]);

  React.useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    void ping();
  }, [ping]);

  return null;
}

export default IdentityPing;
