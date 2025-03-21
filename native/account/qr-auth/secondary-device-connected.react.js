// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import * as React from 'react';
import { Text, View } from 'react-native';

import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  type ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import SecondaryDeviceAddedIcon from '../../vectors/secondary-device-added-icon.react.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

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
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Device added</Text>
        <Text style={styles.body}>
          Your new device has been successfully registered!
        </Text>
        <View style={styles.iconContainer}>
          <SecondaryDeviceAddedIcon />
        </View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton onPress={onPress} label="OK" variant="enabled" />
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
    paddingBottom: 32,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default SecondaryDeviceConnected;
