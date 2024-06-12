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

  const isClientVersionUnsupportedByAnyKeyserver = React.useMemo(() => {
    const connectionIssues = Object.values(connections).map(
      connection => connection?.connectionIssue,
    );
    return connectionIssues.includes('client_version_unsupported');
  }, [connections]);

  const [
    isClientVersionUnsupportedByIdentity,
    setIsClientVersionUnsupportedByIdentity,
  ] = React.useState<boolean>(false);

  const checkVersionSupportedByIdentity = React.useCallback(async () => {
    try {
      const versionSupportedPromise = callVersionSupportedByIdentity();
      void dispatchActionPromise(
        versionSupportedByIdentityActionTypes,
        versionSupportedPromise,
      );
      const { supported: versionSupported } = await versionSupportedPromise;
      setIsClientVersionUnsupportedByIdentity(!versionSupported);
    } catch (error) {
      if (isCurrentUserStaff) {
        console.log(
          'Error checking if client version is supported by identity service:',
          error,
        );
      }
    }
  }, [
    callVersionSupportedByIdentity,
    dispatchActionPromise,
    isCurrentUserStaff,
  ]);

  const hasCheckedIfVersionSupportedByIdentity = React.useRef(false);

  React.useEffect(() => {
    if (hasCheckedIfVersionSupportedByIdentity.current) {
      return;
    }
    hasCheckedIfVersionSupportedByIdentity.current = true;
    void checkVersionSupportedByIdentity();
  }, [checkVersionSupportedByIdentity]);

  const hasShownModalRef = React.useRef(false);
  const { pushModal } = useModalContext();

  React.useEffect(() => {
    if (hasShownModalRef.current) {
      return;
    }
    if (
      isClientVersionUnsupportedByAnyKeyserver ||
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
    dispatchActionPromise,
    isClientVersionUnsupportedByAnyKeyserver,
    isClientVersionUnsupportedByIdentity,
    loggedIn,
    pushModal,
  ]);

  return null;
}

export default MinVersionHandler;
