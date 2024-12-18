// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';

import { PrimaryDeviceQRAuthContext } from './primary-device-qr-auth-context.js';
import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import RegistrationButtonContainer from '../../account/registration/registration-button-container.react.js';
import RegistrationContainer from '../../account/registration/registration-container.react.js';
import RegistrationContentContainer from '../../account/registration/registration-content-container.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  type ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +navigation: QRAuthNavigationProp<'SecondaryDeviceNotResponding'>,
  +route: NavigationRoute<'SecondaryDeviceNotResponding'>,
};

function SecondaryDeviceNotResponding(props: Props): React.Node {
  const { navigation } = props;

  const primaryDeviceQRAuthContext = React.useContext(
    PrimaryDeviceQRAuthContext,
  );
  invariant(
    primaryDeviceQRAuthContext,
    'primaryDeviceQRAuthContext should be set',
  );
  const { onRemoveSecondaryDevice } = primaryDeviceQRAuthContext;

  const navigateToLinkedDevices = React.useCallback(() => {
    navigation
      .getParent<
        ScreenParamList,
        'LinkedDevicesBottomSheet',
        StackNavigationState,
        StackOptions,
        StackNavigationEventMap,
        RootNavigationProp<'LinkedDevicesBottomSheet'>,
      >()
      ?.goBack();
  }, [navigation]);

  const onPressRemove = React.useCallback(async () => {
    try {
      await onRemoveSecondaryDevice();
    } catch (e) {
      console.log(
        'Error while removing unresponsive secondary device ',
        getMessageForException(e),
      );
    }
    navigateToLinkedDevices();
  }, [navigateToLinkedDevices, onRemoveSecondaryDevice]);

  const styles = useStyles(unboundStyles);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>New device not responding</Text>
        <Text style={styles.body}>
          Has the new device successfully logged in? If not, we&apos;d suggest
          removing it and trying again.
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <PrimaryButton
          onPress={onPressRemove}
          label="Remove"
          variant="danger"
        />
        <PrimaryButton
          onPress={navigateToLinkedDevices}
          label="Ignore"
          variant="enabled"
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

export default SecondaryDeviceNotResponding;
