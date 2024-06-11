// @flow

import * as React from 'react';

import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';

function IdentityPing(): React.Node {
  const identityContext = React.useContext(IdentityClientContext);
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const ping = React.useCallback(async () => {
    try {
      if (!identityContext) {
        console.log('Identity context not available');
        return;
      }
      const identityClient = identityContext.identityClient;
      const pingCall = identityClient.versionSupported;
      if (!pingCall) {
        console.log('Ping method unimplemented');
        return;
      }
      await pingCall();
      if (isCurrentUserStaff) {
        console.log('Identity ping successful');
      }
    } catch (error) {
      console.log('Error pinging identity service:', error);
    }
  }, [identityContext, isCurrentUserStaff]);

  React.useEffect(() => {
    void ping();
  }, [ping]);

  return null;
}

export default IdentityPing;
