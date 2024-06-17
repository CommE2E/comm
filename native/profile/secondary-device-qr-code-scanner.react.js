// @flow

import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import { parseDataFromDeepLink } from 'lib/facts/links.js';
import { useBroadcastDeviceListUpdates } from 'lib/hooks/peer-list-hooks.js';
import { addDeviceToDeviceList } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  backupKeysValidator,
  type BackupKeys,
} from 'lib/types/backup-types.js';
import {
  tunnelbrokerMessageTypes,
  type TunnelbrokerMessage,
} from 'lib/types/tunnelbroker/messages.js';
import {
  peerToPeerMessageTypes,
  peerToPeerMessageValidator,
  type PeerToPeerMessage,
} from 'lib/types/tunnelbroker/peer-to-peer-message-types.js';
import { qrCodeAuthMessageTypes } from 'lib/types/tunnelbroker/qr-code-auth-message-types.js';
import { rawDeviceListFromSignedList } from 'lib/utils/device-list-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { getBackupSecret } from '../backup/use-client-backup.js';
import { commCoreModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from '../qr-code/qr-code-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

const barCodeTypes = [BarCodeScanner.Constants.BarCodeType.qr];

type Props = {
  +navigation: ProfileNavigationProp<'SecondaryDeviceQRCodeScanner'>,
  +route: NavigationRoute<'SecondaryDeviceQRCodeScanner'>,
};
// eslint-disable-next-line no-unused-vars
function SecondaryDeviceQRCodeScanner(props: Props): React.Node {
  const [hasPermission, setHasPermission] = React.useState<?boolean>(null);
  const [scanned, setScanned] = React.useState(false);

  const styles = useStyles(unboundStyles);
  const navigation = useNavigation();

  const tunnelbrokerContext = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');

  const aes256Key = React.useRef<?string>(null);
  const secondaryDeviceID = React.useRef<?string>(null);

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerMessage) => {
      const encryptionKey = aes256Key.current;
      const targetDeviceID = secondaryDeviceID.current;
      if (!encryptionKey || !targetDeviceID) {
        return;
      }
      if (message.type !== tunnelbrokerMessageTypes.MESSAGE_TO_DEVICE) {
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

      invariant(identityContext, 'identity context not set');
      const { getAuthMetadata, identityClient } = identityContext;
      const { userID } = await getAuthMetadata();
      if (!userID) {
        throw new Error('missing auth metadata');
      }

      const deviceLists =
        await identityClient.getDeviceListHistoryForUser(userID);
      invariant(deviceLists.length > 0, 'received empty device list history');

      const lastSignedDeviceList = deviceLists[deviceLists.length - 1];
      const deviceList = rawDeviceListFromSignedList(lastSignedDeviceList);

      await broadcastDeviceListUpdates(
        deviceList.devices,
        lastSignedDeviceList,
      );

      if (!payload.requestBackupKeys) {
        Alert.alert('Device added', 'Device registered successfully', [
          { text: 'OK' },
        ]);
        return;
      }

      const backupSecret = await getBackupSecret();
      const backupKeysResponse =
        await commCoreModule.retrieveBackupKeys(backupSecret);
      const backupKeys = assertWithValidator<BackupKeys>(
        JSON.parse(backupKeysResponse),
        backupKeysValidator,
      );

      const backupKeyMessage = await composeTunnelbrokerQRAuthMessage(
        encryptionKey,
        {
          type: qrCodeAuthMessageTypes.BACKUP_DATA_KEY_MESSAGE,
          ...backupKeys,
        },
      );
      await tunnelbrokerContext.sendMessage({
        deviceID: targetDeviceID,
        payload: JSON.stringify(backupKeyMessage),
      });

      Alert.alert('Device added', 'Device registered successfully', [
        { text: 'OK' },
      ]);
    },
    [identityContext, broadcastDeviceListUpdates, tunnelbrokerContext],
  );

  React.useEffect(() => {
    tunnelbrokerContext.addListener(tunnelbrokerMessageListener);

    return () => {
      tunnelbrokerContext.removeListener(tunnelbrokerMessageListener);
    };
  }, [tunnelbrokerMessageListener, tunnelbrokerContext]);

  React.useEffect(() => {
    void (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'No access to camera',
          'Please allow Comm to access your camera in order to scan the QR code.',
          [{ text: 'OK' }],
        );

        navigation.goBack();
      }
    })();
  }, [navigation]);

  const onConnect = React.useCallback(
    async (barCodeEvent: BarCodeEvent) => {
      const { data } = barCodeEvent;
      const parsedData = parseDataFromDeepLink(data);
      const keysMatch = parsedData?.data?.keys;

      if (!parsedData || !keysMatch) {
        Alert.alert(
          'Scan failed',
          'QR code does not contain a valid pair of keys.',
          [{ text: 'OK' }],
        );
        return;
      }

      const keys = JSON.parse(decodeURIComponent(keysMatch));
      const { aes256, ed25519 } = keys;
      aes256Key.current = aes256;
      secondaryDeviceID.current = ed25519;

      try {
        const { deviceID: primaryDeviceID, userID } =
          await identityContext.getAuthMetadata();
        if (!primaryDeviceID || !userID) {
          throw new Error('missing auth metadata');
        }
        await addDeviceToDeviceList(
          identityContext.identityClient,
          userID,
          ed25519,
        );
        const message = await composeTunnelbrokerQRAuthMessage(aes256, {
          type: qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS,
          userID,
          primaryDeviceID,
        });
        await tunnelbrokerContext.sendMessage({
          deviceID: ed25519,
          payload: JSON.stringify(message),
        });
      } catch (err) {
        console.log('Primary device error:', err);
        Alert.alert(
          'Adding device failed',
          'Failed to update the device list',
          [{ text: 'OK' }],
        );
        navigation.goBack();
      }
    },
    [tunnelbrokerContext, identityContext, navigation],
  );

  const onCancelScan = React.useCallback(() => setScanned(false), []);

  const handleBarCodeScanned = React.useCallback(
    (barCodeEvent: BarCodeEvent) => {
      setScanned(true);
      Alert.alert(
        'Connect with this device?',
        'Are you sure you want to allow this device to log in to your account?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancelScan,
          },
          {
            text: 'Connect',
            onPress: () => onConnect(barCodeEvent),
          },
        ],
        { cancelable: false },
      );
    },
    [onCancelScan, onConnect],
  );

  if (hasPermission === null) {
    return <View />;
  }

  // Note: According to the BarCodeScanner Expo docs, we should adhere to two
  // guidances when using the BarCodeScanner:
  // 1. We should specify the potential barCodeTypes we want to scan for to
  //    minimize battery usage.
  // 2. We should set the onBarCodeScanned callback to undefined if it scanned
  //    in order to 'pause' the scanner from continuing to scan while we
  //    process the data from the scan.
  // See: https://docs.expo.io/versions/latest/sdk/bar-code-scanner
  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeTypes={barCodeTypes}
        style={styles.scanner}
      />
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  scanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

export default SecondaryDeviceQRCodeScanner;
