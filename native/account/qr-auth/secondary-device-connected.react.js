// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import * as React from 'react';
import { Text } from 'react-native';

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
  +navigation: QRAuthNavigationProp<'SecondaryDeviceConnected'>,
  +route: NavigationRoute<'SecondaryDeviceConnected'>,
};

function SecondaryDeviceConnected(prop: Props): React.Node {
  const { navigation } = prop;
  const styles = useStyles(unboundStyles);

  const onPress = React.useCallback(() => {
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

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Device added</Text>
        <Text style={styles.body}>
          Your new device has been successfully registered!
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <PrimaryButton onPress={onPress} label="OK" variant="enabled" />
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

export default SecondaryDeviceConnected;
