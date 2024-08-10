// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { useBroadcastDeviceListUpdates } from 'lib/hooks/peer-list-hooks.js';
import { getForeignPeerDeviceIDs } from 'lib/selectors/user-selectors.js';
import { removeDeviceFromDeviceList } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { usePeerToPeerCommunication } from 'lib/tunnelbroker/peer-to-peer-context.js';
import {
  userActionsP2PMessageTypes,
  type DeviceLogoutP2PMessage,
} from 'lib/types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { useSelector } from 'lib/utils/redux-utils.js';

import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import Button from '../components/button.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { BottomSheetRef } from '../types/bottom-sheet.js';
import Alert from '../utils/alert.js';

export type LinkedDevicesBottomSheetParams = {
  +deviceID: string,
};

type Props = {
  +navigation: RootNavigationProp<'LinkedDevicesBottomSheet'>,
  +route: NavigationRoute<'LinkedDevicesBottomSheet'>,
};

function LinkedDevicesBottomSheet(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { deviceID },
    },
  } = props;

  const { goBack } = navigation;

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { identityClient, getAuthMetadata } = identityContext;

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();
  const foreignPeerDevices = useSelector(getForeignPeerDeviceIDs);

  const bottomSheetRef = React.useRef<?BottomSheetRef>();

  const styles = useStyles(unboundStyles);

  const handleDeviceRemoval = React.useCallback(async () => {
    const authMetadata = await getAuthMetadata();
    const { userID } = authMetadata;
    if (!userID) {
      throw new Error('No user ID');
    }

    try {
      await removeDeviceFromDeviceList(identityClient, userID, deviceID);
    } catch (err) {
      console.log('Primary device error:', err);
      Alert.alert(
        'Removing device failed',
        'Failed to update the device list',
        [{ text: 'OK' }],
      );
      bottomSheetRef.current?.close();
    }

    const messageContents: DeviceLogoutP2PMessage = {
      type: userActionsP2PMessageTypes.LOG_OUT_DEVICE,
    };

    await broadcastEphemeralMessage(
      JSON.stringify(messageContents),
      [{ userID, deviceID }],
      authMetadata,
    );
    await broadcastDeviceListUpdates(foreignPeerDevices);
    bottomSheetRef.current?.close();
  }, [
    broadcastDeviceListUpdates,
    broadcastEphemeralMessage,
    deviceID,
    foreignPeerDevices,
    getAuthMetadata,
    identityClient,
  ]);

  const confirmDeviceRemoval = () => {
    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: handleDeviceRemoval },
      ],
      { cancelable: true },
    );
  };

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      <View style={styles.container}>
        <Button
          style={styles.removeButtonContainer}
          onPress={confirmDeviceRemoval}
        >
          <Text style={styles.removeButtonText}>Remove device</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}

const unboundStyles = {
  container: {
    paddingHorizontal: 16,
  },
  removeButtonContainer: {
    backgroundColor: 'vibrantRedButton',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'floatingButtonLabel',
  },
};

export default LinkedDevicesBottomSheet;
