// @flow

import * as React from 'react';

import type { AuthMetadata } from '../shared/identity-client-context.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { LoggedInUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useLoggedInUserInfo(): ?LoggedInUserInfo {
  return useSelector(state =>
    state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo
      : null,
  );
}

function useCommServicesAuthMetadata(): ?AuthMetadata {
  const identityContext = React.useContext(IdentityClientContext);

  const [authMetadata, setAuthMetadata] = React.useState<AuthMetadata | null>(
    null,
  );

  React.useEffect(() => {
    void (async () => {
      try {
        const metadata = await identityContext?.getAuthMetadata();
        setAuthMetadata(metadata ?? null);
      } catch {
        setAuthMetadata(null);
      }
    })();
  }, [identityContext]);

  return authMetadata;
}

export { useLoggedInUserInfo, useCommServicesAuthMetadata };
