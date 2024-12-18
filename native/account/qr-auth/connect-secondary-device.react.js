// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { PrimaryDeviceQRAuthContext } from './primary-device-qr-auth-context.js';
import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import RegistrationButtonContainer from '../../account/registration/registration-button-container.react.js';
import RegistrationContainer from '../../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../../account/registration/registration-content-container.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

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

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Connect with this device?</Text>
        <Text style={styles.body}>
          Are you sure you want to allow this device to log in to your account?
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <PrimaryButton
          onPress={onPressConnect}
          label="Connect"
          variant={connectingInProgress ? 'loading' : 'enabled'}
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
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
};

export default ConnectSecondaryDevice;
