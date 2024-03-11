// @flow

import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import * as React from 'react';
import { View } from 'react-native';

import { parseDataFromDeepLink } from 'lib/facts/links.js';

import type { ProfileNavigationProp } from './profile.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
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

  const addDeviceToList = React.useCallback(
    async (newDeviceID: string) => {
      invariant(identityContext, 'identity context not set');
      const { getDeviceListHistoryForUser, updateDeviceList } =
        identityContext.identityClient;
      invariant(
        updateDeviceList,
        'updateDeviceList() should be defined for primary device',
      );

      const authMetadata = await identityContext.getAuthMetadata();
      if (!authMetadata?.userID) {
        throw new Error('missing auth metadata');
      }

      const deviceLists = await getDeviceListHistoryForUser(
        authMetadata.userID,
      );
      const lastSignedDeviceList = deviceLists[deviceLists.length - 1];
      const deviceList: RawDeviceList = JSON.parse(
        lastSignedDeviceList.rawDeviceList,
      );

      const { devices } = deviceList;
      if (!devices.includes(newDeviceID)) {
        const newDeviceList: RawDeviceList = {
          devices: [...devices, newDeviceID],
          timestamp: Date.now(),
        };
        await updateDeviceList({
          rawDeviceList: JSON.stringify(newDeviceList),
        });
        return true;
      } else {
        return false;
      }
    },
    [identityContext],
  );

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
    (barCodeEvent: BarCodeEvent) => {
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

      void (async () => {
        try {
          invariant(identityContext, 'identity context not set');
          const { deviceID: primaryDeviceID, userID } =
            await identityContext.getAuthMetadata();
          if (!primaryDeviceID || !userID) {
            throw new Error('missing auth metadata');
          }
          await addDeviceToList(ed25519);
          const message = createQRAuthTunnelbrokerMessage(aes256, {
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
      })();
    },
    [
      tunnelbrokerContext,
      addDeviceToList,
      identityContext,
      navigation,
    ],
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
