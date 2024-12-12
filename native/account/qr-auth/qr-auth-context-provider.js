// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { parseDataFromDeepLink } from 'lib/facts/links.js';
import {
  getOwnPeerDevices,
  getKeyserverDeviceID,
} from 'lib/selectors/user-selectors.js';
import { useDeviceListUpdate } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  identityDeviceTypes,
  type IdentityDeviceType,
} from 'lib/types/identity-service-types.js';
import {
  tunnelbrokerToDeviceMessageTypes,
  type TunnelbrokerToDeviceMessage,
} from 'lib/types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
  type PeerToPeerMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import { qrCodeAuthMessageTypes } from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';

import { QRAuthContext } from './qr-auth-context.js';
import { commCoreModule } from '../../native-modules.js';
import { useSelector } from '../../redux/redux-utils.js';
import Alert from '../../utils/alert.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from '../../utils/qr-code-utils.js';

type Props = {
  +children: React.Node,
};
function QRAuthContextProvider(props: Props): React.Node {
  const aes256Key = React.useRef<?string>(null);
  const secondaryDeviceID = React.useRef<?string>(null);
  const secondaryDeviceType = React.useRef<?IdentityDeviceType>(null);
  const [connectingInProgress, setConnectingInProgress] = React.useState(false);

  const ownPeerDevices = useSelector(getOwnPeerDevices);
  const keyserverDeviceID = getKeyserverDeviceID(ownPeerDevices);
  const { goBack } = useNavigation();
  const runDeviceListUpdate = useDeviceListUpdate();
  const { addListener, removeListener, sendMessageToDevice } =
    useTunnelbroker();

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerToDeviceMessage) => {
      if (!connectingInProgress) {
        return;
      }
      const encryptionKey = aes256Key.current;
      const targetDeviceID = secondaryDeviceID.current;
      if (!encryptionKey || !targetDeviceID) {
        return;
      }
      if (message.type !== tunnelbrokerToDeviceMessageTypes.MESSAGE_TO_DEVICE) {
        return;
      }

      let innerMessage: PeerToPeerMessage;
      try {
        innerMessage = JSON.parse(message.payload);
      } catch {
        return;
      }
      if (
        !peerToPeerMessageValidator.is(innerMessage) ||
        innerMessage.type !== peerToPeerMessageTypes.QR_CODE_AUTH_MESSAGE
      ) {
        return;
      }

      const payload = await parseTunnelbrokerQRAuthMessage(
        encryptionKey,
        innerMessage,
      );
      if (
        !payload ||
        payload.type !==
          qrCodeAuthMessageTypes.SECONDARY_DEVICE_REGISTRATION_SUCCESS
      ) {
        return;
      }

      setConnectingInProgress(false);

      Alert.alert('Device added', 'Device registered successfully', [
        { text: 'OK', onPress: goBack },
      ]);
    },
    [goBack, connectingInProgress],
  );

  React.useEffect(() => {
    addListener(tunnelbrokerMessageListener);

    return () => {
      removeListener(tunnelbrokerMessageListener);
    };
  }, [addListener, removeListener, tunnelbrokerMessageListener]);

  const processDeviceListUpdate = React.useCallback(async () => {
    try {
      const { deviceID: primaryDeviceID, userID } =
        await identityContext.getAuthMetadata();
      if (!primaryDeviceID || !userID) {
        throw new Error('missing auth metadata');
      }
      const encryptionKey = aes256Key.current;
      const targetDeviceID = secondaryDeviceID.current;
      if (!encryptionKey || !targetDeviceID) {
        throw new Error('missing tunnelbroker message data');
      }

      const deviceType = secondaryDeviceType.current;

      const sendDeviceListUpdateSuccessMessage = async () => {
        let backupData = null;
        if (deviceType !== identityDeviceTypes.KEYSERVER) {
          backupData = await commCoreModule.getQRAuthBackupData();
        }
        const message = await composeTunnelbrokerQRAuthMessage(encryptionKey, {
          type: qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS,
          userID,
          primaryDeviceID,
          backupData,
        });
        await sendMessageToDevice({
          deviceID: targetDeviceID,
          payload: JSON.stringify(message),
        });
      };

      const handleReplaceDevice = async () => {
        try {
          if (!keyserverDeviceID) {
            throw new Error('missing keyserver device ID');
          }
          await runDeviceListUpdate({
            type: 'replace',
            deviceIDToRemove: keyserverDeviceID,
            newDeviceID: targetDeviceID,
          });
          await sendDeviceListUpdateSuccessMessage();
        } catch (err) {
          console.log('Device replacement error:', err);
          Alert.alert(
            'Adding device failed',
            'Failed to update the device list',
            [{ text: 'OK' }],
          );
          goBack();
        }
      };

      if (
        deviceType !== identityDeviceTypes.KEYSERVER ||
        !keyserverDeviceID ||
        keyserverDeviceID === targetDeviceID
      ) {
        await runDeviceListUpdate({
          type: 'add',
          deviceID: targetDeviceID,
        });
        await sendDeviceListUpdateSuccessMessage();
        return;
      }

      Alert.alert(
        'Existing keyserver detected',
        'Do you want to replace your existing keyserver with this new one?',
        [
          {
            text: 'No',
            onPress: goBack,
            style: 'cancel',
          },
          {
            text: 'Replace',
            onPress: handleReplaceDevice,
            style: 'destructive',
          },
        ],
      );
    } catch (err) {
      setConnectingInProgress(false);
      console.log('Primary device error:', err);
      Alert.alert('Adding device failed', 'Failed to update the device list', [
        { text: 'OK' },
      ]);
      goBack();
    }
  }, [
    goBack,
    identityContext,
    keyserverDeviceID,
    runDeviceListUpdate,
    sendMessageToDevice,
  ]);

  const onConnect = React.useCallback(
    async (data: string) => {
      setConnectingInProgress(true);

      const parsedData = parseDataFromDeepLink(data);
      const keysMatch = parsedData?.data?.keys;

      if (!parsedData || !keysMatch) {
        Alert.alert(
          'Scan failed',
          'QR code does not contain a valid pair of keys.',
          [{ text: 'OK' }],
        );
        setConnectingInProgress(false);
        return;
      }

      try {
        const keys = JSON.parse(decodeURIComponent(keysMatch));
        const { aes256, ed25519 } = keys;
        aes256Key.current = aes256;
        secondaryDeviceID.current = ed25519;
        secondaryDeviceType.current = parsedData.data.deviceType;
      } catch (err) {
        setConnectingInProgress(false);
        console.log('Failed to decode URI component:', err);
        return;
      }

      await processDeviceListUpdate();
    },
    [processDeviceListUpdate],
  );

  const onRemoveSecondaryDevice = React.useCallback(async () => {
    if (!secondaryDeviceID.current) {
      console.log('No secondary device to remove');
      return;
    }

    await runDeviceListUpdate({
      type: 'remove',
      deviceID: secondaryDeviceID.current,
    });
  }, [runDeviceListUpdate]);

  const contextValue = React.useMemo(
    () => ({
      onConnect,
      connectingInProgress,
      onRemoveSecondaryDevice,
    }),
    [onConnect, connectingInProgress, onRemoveSecondaryDevice],
  );

  return (
    <QRAuthContext.Provider value={contextValue}>
      {props.children}
    </QRAuthContext.Provider>
  );
}

export { QRAuthContextProvider };
