// @flow

import * as React from 'react';

import {
  useVersionSupportedByIdentity,
  versionSupportedByIdentityActionTypes,
} from 'lib/actions/user-actions.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useShowVersionUnsupportedAlert } from '../utils/hooks.js';

function VersionSupportedChecker(): React.Node {
  const hasRun = React.useRef(false);

  const dispatchActionPromise = useDispatchActionPromise();
  const callVersionSupportedByIdentity = useVersionSupportedByIdentity();
  const showVersionUnsupportedAlert = useShowVersionUnsupportedAlert(true);

  const checkVersionSupport = React.useCallback(async () => {
    try {
      const versionSupportedPromise = callVersionSupportedByIdentity();
      void dispatchActionPromise(
        versionSupportedByIdentityActionTypes,
        versionSupportedPromise,
      );
      const { supported: isVersionSupported } = await versionSupportedPromise;
      if (isVersionSupported) {
        return;
      }
      showVersionUnsupportedAlert();
    } catch (error) {
      console.log('Error checking version:', error);
    }
  }, [
    callVersionSupportedByIdentity,
    dispatchActionPromise,
    showVersionUnsupportedAlert,
  ]);

  React.useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    void checkVersionSupport();
  }, [checkVersionSupport]);

  return null;
}

export default VersionSupportedChecker;
