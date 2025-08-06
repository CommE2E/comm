// @flow

import * as React from 'react';

import { restorationNotifyPeersActionType } from '../actions/backup-actions.js';
import { useUserDataRestoreContext } from '../backup/user-data-restore-context.js';
import { useBroadcastDeviceListUpdates } from '../hooks/peer-list-hooks.js';
import { useDeviceKind } from '../hooks/primary-device-hooks.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
import { getForeignPeerDeviceIDs } from '../selectors/user-selectors.js';
import { useTunnelbroker } from '../tunnelbroker/tunnelbroker-context.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { useFullBackupSupportEnabled } from '../utils/services-utils.js';

function RestoreBackupHandler(): React.Node {
  const fullBackupSupport = useFullBackupSupportEnabled();

  const persistedStateLoaded = usePersistedStateLoaded();
  const restoreBackupState = useSelector(state => state.restoreBackupState);
  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const { userDataRestore } = useUserDataRestoreContext();
  const deviceKind = useDeviceKind();

  const dispatch = useDispatch();
  const peerDevices = useSelector(getForeignPeerDeviceIDs);
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const { socketState } = useTunnelbroker();

  // - Peer notify handler
  const shouldNotifyPeers =
    restoreBackupState.status === 'user_data_restore_completed' &&
    !restoreBackupState.payload.peersNotified;
  React.useEffect(() => {
    if (
      !fullBackupSupport ||
      !shouldNotifyPeers ||
      !persistedStateLoaded ||
      !socketState.isAuthorized ||
      deviceKind === 'unknown'
    ) {
      return;
    }

    void (async () => {
      // only primary device should broadcast device list update
      if (deviceKind === 'primary') {
        await broadcastDeviceListUpdates(peerDevices);
      }

      // dispatch success to stop re-triggering this effect
      dispatch({ type: restorationNotifyPeersActionType });
    })();
  }, [
    broadcastDeviceListUpdates,
    deviceKind,
    dispatch,
    peerDevices,
    persistedStateLoaded,
    shouldNotifyPeers,
    socketState.isAuthorized,
    fullBackupSupport,
  ]);

  // - Restoration retry handler
  // We want this handler to be executed only once
  const restoreExecuted = React.useRef(false);
  React.useEffect(() => {
    if (
      !fullBackupSupport ||
      !persistedStateLoaded ||
      restoreExecuted.current ||
      !userID ||
      !accessToken ||
      deviceKind === 'unknown'
    ) {
      return;
    }
    if (
      restoreBackupState.status !== 'user_data_restore_step_completed' &&
      restoreBackupState.status !== 'user_data_restore_failed'
    ) {
      return;
    }

    void userDataRestore(deviceKind === 'primary', userID, accessToken);
    restoreExecuted.current = true;
  }, [
    accessToken,
    deviceKind,
    persistedStateLoaded,
    restoreBackupState.status,
    userDataRestore,
    userID,
    fullBackupSupport,
  ]);

  return null;
}

export { RestoreBackupHandler };
