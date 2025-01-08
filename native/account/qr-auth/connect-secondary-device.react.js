// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { parseDataFromDeepLink } from 'lib/facts/links.js';
import { identityDeviceTypes } from 'lib/types/identity-service-types.js';

import { PrimaryDeviceQRAuthContext } from './primary-device-qr-auth-context.js';
import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import ConnectSecondaryDeviceLaptopIcon from '../../vectors/connect-secondary-device-laptop-icon.react.js';
import ConnectSecondaryDeviceMobileIcon from '../../vectors/connect-secondary-device-mobile-icon.react.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

export type ConnectSecondaryDeviceParams = {
  +data: string,
};

type Props = {
  +navigation: QRAuthNavigationProp<'ConnectSecondaryDevice'>,
  +route: NavigationRoute<'ConnectSecondaryDevice'>,
};

function ConnectSecondaryDevice(props: Props): React.Node {
  const { route } = props;
  const data = route.params?.data;

  const styles = useStyles(unboundStyles);

  const primaryDeviceQRAuthContext = React.useContext(
    PrimaryDeviceQRAuthContext,
  );
  invariant(
    primaryDeviceQRAuthContext,
    'primaryDeviceQRAuthContext should be set',
  );
  const { onConnect, connectingInProgress } = primaryDeviceQRAuthContext;

  const onPressConnect = React.useCallback(() => {
    void onConnect(data);
  }, [data, onConnect]);

  const icon = React.useMemo(() => {
    const parsedData = parseDataFromDeepLink(data);
    if (
      parsedData?.data &&
      (parsedData.data.deviceType === identityDeviceTypes.IOS ||
        parsedData.data.deviceType === identityDeviceTypes.ANDROID)
    ) {
      return <ConnectSecondaryDeviceMobileIcon />;
    }
    return <ConnectSecondaryDeviceLaptopIcon />;
  }, [data]);

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Connect with this device?</Text>
        <Text style={styles.body}>
          Are you sure you want to allow this device to log in to your account?
        </Text>
        <View style={styles.iconContainer}>{icon}</View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onPressConnect}
          label="Connect"
          variant={connectingInProgress ? 'loading' : 'enabled'}
        />
      </AuthButtonContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  iconContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default ConnectSecondaryDevice;
