// @flow

import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import * as React from 'react';
import { View } from 'react-native';

import { parseKeysFromQRCodeURL } from 'lib/facts/links.js';

import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

const barCodeTypes = [BarCodeScanner.Constants.BarCodeType.qr];

// eslint-disable-next-line no-unused-vars
function SecondaryDeviceQRCodeScanner(props: { ... }): React.Node {
  const [hasPermission, setHasPermission] = React.useState(null);
  const [scanned, setScanned] = React.useState(false);

  const styles = useStyles(unboundStyles);
  const navigation = useNavigation();

  React.useEffect(() => {
    (async () => {
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

  const onConnect = React.useCallback((barCodeEvent: BarCodeEvent) => {
    const { data } = barCodeEvent;
    const keysMatch = parseKeysFromQRCodeURL(data);
    const keys = JSON.parse(decodeURIComponent(keysMatch));

    Alert.alert(
      'Scan successful',
      `QR code contains the following keys: ${JSON.stringify(keys)}`,
      [{ text: 'OK' }],
    );
  }, []);

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
