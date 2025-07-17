// @flow

import * as React from 'react';

import { sendBackupDataToSecondaryActionTypes } from 'lib/actions/backup-actions.js';
import { getOwnPeerDevices } from 'lib/selectors/user-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { usePeerToPeerCommunication } from 'lib/tunnelbroker/peer-to-peer-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  type BackupDataP2PMessage,
  userActionsP2PMessageTypes,
} from 'lib/types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { fullBackupSupport } from 'lib/utils/services-utils.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';

function SecondaryDevicesBackupHandler(): React.Node {
  const identityContext = React.useContext(IdentityClientContext);
  if (!identityContext) {
    throw new Error('Identity service client is not initialized');
  }
  const { getAuthMetadata } = identityContext;

  const ownDevicesWithoutBackup = useSelector(
    state => state.backupStore.ownDevicesWithoutBackup,
  );
  const ownDevices = useSelector(getOwnPeerDevices);
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();
  const dispatchActionPromise = useDispatchActionPromise();
  const { socketState } = useTunnelbroker();
  const restoreBackupState = useSelector(state => state.restoreBackupState);

  const sendBackupDataToSecondaryDevices = React.useCallback(async (): Promise<
    $ReadOnlyArray<string>,
  > => {
    if (!ownDevicesWithoutBackup || !ownDevicesWithoutBackup.length) {
      return [];
    }

    // Avoid sending to devices that are removed since last backup upload
    const removedDevices = ownDevicesWithoutBackup.filter(
      deviceID =>
        !ownDevices.find(ownDevice => ownDevice.deviceID === deviceID),
    );

    const backupData = await commCoreModule.getQRAuthBackupData();

    const authMetadata = await getAuthMetadata();
    const { userID: thisUserID, deviceID: thisDeviceID } = authMetadata;
    if (!thisDeviceID || !thisUserID) {
      throw new Error('No auth metadata');
    }

    const backupDataP2PMessage: BackupDataP2PMessage = {
      type: userActionsP2PMessageTypes.BACKUP_DATA,
      userID: thisUserID,
      primaryDeviceID: thisDeviceID,
      backupData,
    };
    const rawPayload = JSON.stringify(backupDataP2PMessage);

    const recipients =
      ownDevicesWithoutBackup
        ?.filter(deviceID => !removedDevices.includes(deviceID))
        ?.map(deviceID => ({
          deviceID,
          userID: thisUserID,
        })) ?? [];

    const devicesThatReceivedMessage = await broadcastEphemeralMessage(
      rawPayload,
      recipients,
      authMetadata,
    );
    return [...removedDevices, ...devicesThatReceivedMessage];
  }, [
    broadcastEphemeralMessage,
    getAuthMetadata,
    ownDevices,
    ownDevicesWithoutBackup,
  ]);

  const executed = React.useRef(false);
  React.useEffect(() => {
    if (
      !fullBackupSupport ||
      executed.current ||
      !socketState.isAuthorized ||
      !ownDevicesWithoutBackup ||
      !ownDevicesWithoutBackup.length
    ) {
      return;
    }

    const userDataBackupDone =
      restoreBackupState.status === 'user_data_restore_completed' ||
      restoreBackupState.status === 'user_data_backup_success';

    if (!userDataBackupDone) {
      return;
    }

    void dispatchActionPromise(
      sendBackupDataToSecondaryActionTypes,
      sendBackupDataToSecondaryDevices(),
    );

    executed.current = true;
  }, [
    dispatchActionPromise,
    ownDevicesWithoutBackup,
    restoreBackupState.status,
    sendBackupDataToSecondaryDevices,
    socketState.isAuthorized,
  ]);

  return null;
}

export { SecondaryDevicesBackupHandler };
