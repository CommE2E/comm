// @flow

import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

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

import type { QRAuthNavigationProp } from '../account/qr-auth/qr-auth-navigator.react.js';
import TextInput from '../components/text-input.react.js';
import { commCoreModule } from '../native-modules.js';
import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import {
  composeTunnelbrokerQRAuthMessage,
  parseTunnelbrokerQRAuthMessage,
} from '../utils/qr-code-utils.js';
import { deviceIsEmulator } from '../utils/url-utils.js';

const barCodeTypes = [BarCodeScanner.Constants.BarCodeType.qr];

type Props = {
  +navigation: QRAuthNavigationProp<'SecondaryDeviceQRCodeScanner'>,
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
  const secondaryDeviceType = React.useRef<?IdentityDeviceType>(null);

  const runDeviceListUpdate = useDeviceListUpdate();

  const ownPeerDevices = useSelector(getOwnPeerDevices);
  const keyserverDeviceID = getKeyserverDeviceID(ownPeerDevices);

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

      Alert.alert('Device added', 'Device registered successfully', [
        { text: 'OK', onPress: goBack },
      ]);
    },
    [goBack],
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
        await tunnelbrokerContext.sendMessageToDevice({
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
    tunnelbrokerContext,
  ]);

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

    try {
      const keys = JSON.parse(decodeURIComponent(keysMatch));
      const { aes256, ed25519 } = keys;
      aes256Key.current = aes256;
      secondaryDeviceID.current = ed25519;
      secondaryDeviceType.current = parsedData.data.deviceType;
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

      try {
        const keys = JSON.parse(decodeURIComponent(keysMatch));
        const { aes256, ed25519 } = keys;
        aes256Key.current = aes256;
        secondaryDeviceID.current = ed25519;
        secondaryDeviceType.current = parsedData.data.deviceType;
      } catch (err) {
        console.log('Failed to decode URI component:', err);
        return;
      }

      await processDeviceListUpdate();
    },
    [processDeviceListUpdate],
  );

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
            onPress: goBack,
          },
          {
            text: 'Connect',
            onPress: () => onConnect(barCodeEvent),
          },
        ],
        { cancelable: false },
      );
    },
    [goBack, onConnect],
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
