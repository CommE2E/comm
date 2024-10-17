// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBroadcastDeviceListUpdates } from 'lib/hooks/peer-list-hooks.js';
import { getAllPeerDevices } from 'lib/selectors/user-selectors.js';
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
  +shouldDisplayRemoveButton: boolean,
};

type Props = {
  +navigation: RootNavigationProp<'LinkedDevicesBottomSheet'>,
  +route: NavigationRoute<'LinkedDevicesBottomSheet'>,
};

function LinkedDevicesBottomSheet(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { deviceID, shouldDisplayRemoveButton },
    },
  } = props;

  const { goBack } = navigation;

  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { identityClient, getAuthMetadata } = identityContext;

  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();
  const allPeerDevices = useSelector(getAllPeerDevices);

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const bottomSheetRef = React.useRef<?BottomSheetRef>();
  const removeDeviceContainerRef =
    React.useRef<?React.ElementRef<typeof View>>();

  const styles = useStyles(unboundStyles);
  const insets = useSafeAreaInsets();

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

    const sendLogoutMessagePromise = broadcastEphemeralMessage(
      JSON.stringify(messageContents),
      [{ userID, deviceID }],
      authMetadata,
    );
    const broadcastUpdatePromise = broadcastDeviceListUpdates(
      allPeerDevices.filter(peerDeviceID => deviceID !== peerDeviceID),
    );
    await Promise.all([sendLogoutMessagePromise, broadcastUpdatePromise]);
    bottomSheetRef.current?.close();
  }, [
    broadcastDeviceListUpdates,
    broadcastEphemeralMessage,
    deviceID,
    allPeerDevices,
    getAuthMetadata,
    identityClient,
  ]);

  const confirmDeviceRemoval = () => {
    Alert.alert(
      'Remove device',
      'Are you sure you want to remove this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: handleDeviceRemoval },
      ],
      { cancelable: true },
    );
  };

  const onLayout = React.useCallback(() => {
    removeDeviceContainerRef.current?.measure(
      (x, y, width, height, pageX, pageY) => {
        if (
          height === null ||
          height === undefined ||
          pageY === null ||
          pageY === undefined
        ) {
          return;
        }

        setContentHeight(height + insets.bottom);
      },
    );
  }, [insets.bottom, setContentHeight]);

  let removeDeviceButton;
  if (shouldDisplayRemoveButton) {
    removeDeviceButton = (
      <Button
        style={styles.removeButtonContainer}
        onPress={confirmDeviceRemoval}
      >
        <Text style={styles.removeButtonText}>Remove device</Text>
      </Button>
    );
  }

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      <View
        style={styles.container}
        ref={removeDeviceContainerRef}
        onLayout={onLayout}
      >
        {removeDeviceButton}
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
