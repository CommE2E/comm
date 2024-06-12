// @flow

import * as React from 'react';

import {
  useLogOut,
  logOutActionTypes,
  useVersionSupportedByIdentity,
  versionSupportedByIdentityActionTypes,
} from 'lib/actions/user-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { allConnectionInfosSelector } from 'lib/selectors/keyserver-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import VersionUnsupportedModal from '../modals/version-unsupported-modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function MinVersionHandler(): React.Node {
  const connections = useSelector(allConnectionInfosSelector);
  const loggedIn = useSelector(isLoggedIn);
  const dispatchActionPromise = useDispatchActionPromise();
  const callVersionSupportedByIdentity = useVersionSupportedByIdentity();
  const callLogOut = useLogOut();
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const isClientVersionUnsupportedByKeyserver = React.useMemo(() => {
    const connectionIssues = Object.values(connections).map(
      connection => connection?.connectionIssue,
    );
    return connectionIssues.includes('client_version_unsupported');
  }, [connections]);

  const checkVersionSupportedByIdentity = React.useCallback(async () => {
    try {
      const versionSupportedPromise = callVersionSupportedByIdentity();
      void dispatchActionPromise(
        versionSupportedByIdentityActionTypes,
        versionSupportedPromise,
      );
      return await versionSupportedPromise;
    } catch (error) {
      if (isCurrentUserStaff) {
        console.log(
          'Error checking if client version is supported by identity service:',
          error,
        );
      }
      return true;
    }
  }, [
    callVersionSupportedByIdentity,
    dispatchActionPromise,
    isCurrentUserStaff,
  ]);

  const hasShownModalRef = React.useRef(false);
  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (hasShownModalRef.current) {
      return;
    }
    const isClientVersionUnsupportedByIdentity =
      !checkVersionSupportedByIdentity();
    if (
      isClientVersionUnsupportedByKeyserver ||
      isClientVersionUnsupportedByIdentity
    ) {
      hasShownModalRef.current = true;
      pushModal(<VersionUnsupportedModal />);
    }
    if (isClientVersionUnsupportedByIdentity && loggedIn) {
      void dispatchActionPromise(logOutActionTypes, callLogOut());
    }
  }, [
    callLogOut,
    checkVersionSupportedByIdentity,
    dispatchActionPromise,
    isClientVersionUnsupportedByKeyserver,
    loggedIn,
    pushModal,
  ]);

  return null;
}

export default MinVersionHandler;
