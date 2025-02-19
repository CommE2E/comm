// @flow

import type {
  StackNavigationEventMap,
  StackNavigationState,
  StackOptions,
} from '@react-navigation/core';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';

import { PrimaryDeviceQRAuthContext } from './primary-device-qr-auth-context.js';
import type { QRAuthNavigationProp } from './qr-auth-navigator.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  type ScreenParamList,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import SecondaryDeviceNotRespondingIcon from '../../vectors/secondary-device-not-responding-icon.react.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

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

  const [isRemovingDevice, setIsRemovingDevice] = React.useState(false);
  const removeButtonVariant = isRemovingDevice ? 'loading' : 'danger';
  const onPressRemove = React.useCallback(async () => {
    try {
      setIsRemovingDevice(true);
      await onRemoveSecondaryDevice();
    } catch (e) {
      console.log(
        'Error while removing unresponsive secondary device ',
        getMessageForException(e),
      );
    } finally {
      setIsRemovingDevice(false);
      navigateToLinkedDevices();
    }
  }, [navigateToLinkedDevices, onRemoveSecondaryDevice]);

  const styles = useStyles(unboundStyles);

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>New device not responding</Text>
        <Text style={styles.body}>
          Has the new device successfully logged in? If not, we&apos;d suggest
          removing it and trying again.
        </Text>
        <View style={styles.iconContainer}>
          <SecondaryDeviceNotRespondingIcon />
        </View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onPressRemove}
          label="Remove"
          variant={removeButtonVariant}
        />
        <PrimaryButton
          onPress={navigateToLinkedDevices}
          label="Ignore"
          variant="enabled"
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
    paddingBottom: 32,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default SecondaryDeviceNotResponding;
