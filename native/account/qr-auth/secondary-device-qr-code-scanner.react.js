// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  useCodeScanner,
  Camera,
  useCameraPermission,
  useCameraDevice,
  type Code,
} from 'react-native-vision-camera';

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
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

const barCodeTypes = ['qr'];

type Props = {
  +navigation: QRAuthNavigationProp<'SecondaryDeviceQRCodeScanner'>,
  +route: NavigationRoute<'SecondaryDeviceQRCodeScanner'>,
};

// eslint-disable-next-line no-unused-vars
function SecondaryDeviceQRCodeScanner(props: Props): React.Node {
  const [urlInput, setURLInput] = React.useState('');

  const styles = useStyles(unboundStyles);
  const { goBack, setOptions, navigate } = useNavigation();
  const { panelForegroundTertiaryLabel } = useColors();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  React.useEffect(() => {
    void (async () => {
      const status = await requestPermission();

      if (!status) {
        Alert.alert(
          'No access to camera',
          'Please allow Comm to access your camera in order to scan the QR code.',
          [{ text: 'OK' }],
        );

        goBack();
      }
    })();
  }, [goBack, requestPermission]);

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

  const onChangeText = React.useCallback(
    (text: string) => setURLInput(text),
    [],
  );

  const handleBarCodeScanned = React.useCallback(
    (codes: $ReadOnlyArray<Code>) => {
      const { value } = codes[0];
      if (value) {
        void navigateToNextScreen(value);
      }
    },
    [navigateToNextScreen],
  );

  const codeScanner = useCodeScanner({
    codeTypes: barCodeTypes,
    onCodeScanned: handleBarCodeScanned,
  });

  if (!hasPermission) {
    return <View />;
  }

  if (deviceIsEmulator) {
    return (
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
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
        </AuthContentContainer>
      </AuthContainer>
    );
  }

  let camera = null;

  if (device) {
    camera = (
      <Camera
        style={styles.scanner}
        device={device}
        codeScanner={codeScanner}
        isActive
      />
    );
  }

  return <View style={styles.scannerContainer}>{camera}</View>;
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
  scrollViewContentContainer: {
    flexGrow: 1,
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
