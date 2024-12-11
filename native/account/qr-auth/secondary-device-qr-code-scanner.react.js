// @flow

import { useFocusEffect } from '@react-navigation/core';
import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner, type BarCodeEvent } from 'expo-barcode-scanner';
import * as React from 'react';
import { View, Text } from 'react-native';

import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';

import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import TextInput from '../../components/text-input.react.js';
import HeaderRightTextButton from '../../navigation/header-right-text-button.react.js';
import {
  type NavigationRoute,
  ConnectSecondaryDeviceRouteName,
  QRAuthNotPrimaryDeviceRouteName,
} from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';
import { deviceIsEmulator } from '../../utils/url-utils.js';

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
  const { goBack, setOptions, navigate } = useNavigation();
  const { panelForegroundTertiaryLabel } = useColors();

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

  const checkIfPrimaryDevice = useCheckIfPrimaryDevice();
  const navigateToNextScreen = React.useCallback(
    async (data: string) => {
      const isPrimaryDevice = await checkIfPrimaryDevice();

      if (isPrimaryDevice) {
        navigate(ConnectSecondaryDeviceRouteName, { data });
      } else {
        navigate(QRAuthNotPrimaryDeviceRouteName);
      }
    },
    [checkIfPrimaryDevice, navigate],
  );

  const onPressSave = React.useCallback(() => {
    if (!urlInput) {
      return;
    }

    void navigateToNextScreen(urlInput);
  }, [navigateToNextScreen, urlInput]);

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

  const onFocusCallback = React.useCallback(() => {
    setScanned(false);
  }, [setScanned]);

  useFocusEffect(onFocusCallback);

  const onChangeText = React.useCallback(
    (text: string) => setURLInput(text),
    [],
  );

  const handleBarCodeScanned = React.useCallback(
    (barCodeEvent: BarCodeEvent) => {
      setScanned(true);
      const { data } = barCodeEvent;
      void navigateToNextScreen(data);
    },
    [navigateToNextScreen],
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
