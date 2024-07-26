// @flow

import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { parseDataFromDeepLink } from 'lib/facts/links.js';
import {
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
} from 'lib/hooks/peer-list-hooks.js';
import {
  getForeignPeerDevices,
  getOwnPeerDevices,
  getKeyserverDeviceID,
} from 'lib/selectors/user-selectors.js';
import {
  addDeviceToDeviceList,
  replaceDeviceInDeviceList,
} from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import {
  backupKeysValidator,
  type BackupKeys,
} from 'lib/types/backup-types.js';
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
import { rawDeviceListFromSignedList } from 'lib/utils/device-list-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { getBackupSecret } from '../backup/use-client-backup.js';
import TextInput from '../components/text-input.react.js';
import { commCoreModule } from '../native-modules.js';
import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from '../qr-code/qr-code-utils.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import { deviceIsEmulator } from '../utils/url-utils.js';

const barCodeTypes = [BarCodeScanner.Constants.BarCodeType.qr];

type Props = {
  +navigation: ProfileNavigationProp<'SecondaryDeviceQRCodeScanner'>,
  +route: NavigationRoute<'SecondaryDeviceQRCodeScanner'>,
};

// eslint-disable-next-line no-unused-vars
function SecondaryDeviceQRCodeScanner(props: Props): React.Node {
  const [hasPermission, setHasPermission] = React.useState<?boolean>(null);
  const [scanned, setScanned] = React.useState(false);
  const [urlInput, setURLInput] = React.useState('');

  const styles = useStyles(unboundStyles);
  const { goBack, setOptions } = useNavigation();

  const tunnelbrokerContext = useTunnelbroker();
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');

  const aes256Key = React.useRef<?string>(null);
  const secondaryDeviceID = React.useRef<?string>(null);
  const secondaryDeviceType = React.useRef<?string>(null);

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  const foreignPeerDevices = useSelector(getForeignPeerDevices);
  const ownPeerDevices = useSelector(getOwnPeerDevices);

  const { panelForegroundTertiaryLabel } = useColors();

  const tunnelbrokerMessageListener = React.useCallback(
    async (message: TunnelbrokerToDeviceMessage) => {
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

      invariant(identityContext, 'identity context not set');
      const { getAuthMetadata, identityClient } = identityContext;
      const { userID, deviceID } = await getAuthMetadata();
      if (!userID || !deviceID) {
        throw new Error('missing auth metadata');
      }

      const deviceLists =
        await identityClient.getDeviceListHistoryForUser(userID);
      invariant(deviceLists.length > 0, 'received empty device list history');

      const lastSignedDeviceList = deviceLists[deviceLists.length - 1];
      const deviceList = rawDeviceListFromSignedList(lastSignedDeviceList);

      const ownOtherDevices = deviceList.devices.filter(it => it !== deviceID);

      await Promise.all([
        broadcastDeviceListUpdates(
          [...ownOtherDevices, ...foreignPeerDevices],
          lastSignedDeviceList,
        ),
        getAndUpdateDeviceListsForUsers([userID]),
      ]);

      if (!payload.requestBackupKeys) {
        Alert.alert('Device added', 'Device registered successfully', [
          { text: 'OK', onPress: goBack },
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
      await tunnelbrokerContext.sendMessageToDevice({
        deviceID: targetDeviceID,
        payload: JSON.stringify(backupKeyMessage),
      });

      Alert.alert('Device added', 'Device registered successfully', [
        { text: 'OK', onPress: goBack },
      ]);
    },
    [
      identityContext,
      broadcastDeviceListUpdates,
      foreignPeerDevices,
      getAndUpdateDeviceListsForUsers,
      tunnelbrokerContext,
      goBack,
    ],
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

        goBack();
      }
    })();
  }, [goBack]);

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
      const keyserverDeviceID = getKeyserverDeviceID(ownPeerDevices);

      const sendDeviceListUpdateSuccessMessage = async () => {
        const message = await composeTunnelbrokerQRAuthMessage(encryptionKey, {
          type: qrCodeAuthMessageTypes.DEVICE_LIST_UPDATE_SUCCESS,
          userID,
          primaryDeviceID,
        });
        await tunnelbrokerContext.sendMessageToDevice({
          deviceID: targetDeviceID,
          payload: JSON.stringify(message),
        });
      };

      const handleReplaceDevice = async () => {
        try {
          if (!keyserverDeviceID) {
            throw new Error('missing ID for keyserver device to be replaced');
          }
          await replaceDeviceInDeviceList(
            identityContext.identityClient,
            userID,
            keyserverDeviceID,
            targetDeviceID,
          );
          await sendDeviceListUpdateSuccessMessage();
        } catch (err) {
          console.log('Device replacement or update error:', err);
          Alert.alert(
            'Adding device failed',
            'Failed to update the device list',
            [{ text: 'OK' }],
          );
          goBack();
        }
      };

      if (
        deviceType === 'keyserver' &&
        keyserverDeviceID &&
        keyserverDeviceID !== targetDeviceID
      ) {
        Alert.alert(
          'Existing keyserver detected',
          'Do you want to replace your existing keyserver with this new one?',
          [
            {
              text: 'Cancel',
              onPress: () => {
                goBack();
              },
              style: 'cancel',
            },
            {
              text: 'OK',
              onPress: handleReplaceDevice,
            },
          ],
        );
      } else {
        await addDeviceToDeviceList(
          identityContext.identityClient,
          userID,
          targetDeviceID,
        );
        await sendDeviceListUpdateSuccessMessage();
      }
    } catch (err) {
      console.log('Primary device error:', err);
      Alert.alert('Adding device failed', 'Failed to update the device list', [
        { text: 'OK' },
      ]);
      goBack();
    }
  }, [goBack, identityContext, ownPeerDevices, tunnelbrokerContext]);

  const onPressSave = React.useCallback(async () => {
    if (!urlInput) {
      return;
    }

    const parsedData = parseDataFromDeepLink(urlInput);
    const keysMatch = parsedData?.data?.keys;

    if (!parsedData || !keysMatch) {
      Alert.alert(
        'Scan failed',
        'QR code does not contain a valid pair of keys.',
        [{ text: 'OK' }],
      );
      return;
    }

    secondaryDeviceType.current = parsedData.data.deviceType;

    try {
      const keys = JSON.parse(decodeURIComponent(keysMatch));
      const { aes256, ed25519 } = keys;
      aes256Key.current = aes256;
      secondaryDeviceID.current = ed25519;
    } catch (err) {
      console.log('Failed to decode URI component:', err);
      return;
    }
    await processDeviceListUpdate();
  }, [processDeviceListUpdate, urlInput]);

  const buttonDisabled = !urlInput;
  React.useEffect(() => {
    if (!deviceIsEmulator) {
      return;
    }
    setOptions({
      headerRight: () => (
        <HeaderRightTextButton
          label="Save"
          onPress={onPressSave}
          disabled={buttonDisabled}
        />
      ),
    });
  }, [buttonDisabled, onPressSave, setOptions]);

  const onChangeText = React.useCallback(
    (text: string) => setURLInput(text),
    [],
  );

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

      secondaryDeviceType.current = parsedData.data.deviceType;

      try {
        const keys = JSON.parse(decodeURIComponent(keysMatch));
        const { aes256, ed25519 } = keys;
        aes256Key.current = aes256;
        secondaryDeviceID.current = ed25519;
      } catch (err) {
        console.log('Failed to decode URI component:', err);
        return;
      }

      await processDeviceListUpdate();
    },
    [processDeviceListUpdate],
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

  if (deviceIsEmulator) {
    return (
      <View style={styles.textInputContainer}>
        <Text style={styles.header}>QR Code URL</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={onChangeText}
            placeholder="QR Code URL"
            placeholderTextColor={panelForegroundTertiaryLabel}
            autoFocus={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
    );
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
    <View style={styles.scannerContainer}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeTypes={barCodeTypes}
        style={styles.scanner}
      />
    </View>
  );
}

const unboundStyles = {
  scannerContainer: {
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
  textInputContainer: {
    paddingTop: 8,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  inputContainer: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
};

export default SecondaryDeviceQRCodeScanner;
