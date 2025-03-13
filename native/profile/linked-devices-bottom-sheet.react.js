// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeviceListUpdate } from 'lib/shared/device-list-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import { usePeerToPeerCommunication } from 'lib/tunnelbroker/peer-to-peer-context.js';
import {
  userActionsP2PMessageTypes,
  type DeviceLogoutP2PMessage,
} from 'lib/types/tunnelbroker/user-actions-peer-to-peer-message-types.js';

import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import Button from '../components/button.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
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
  const { getAuthMetadata } = identityContext;

  const runDeviceListUpdate = useDeviceListUpdate();
  const { broadcastEphemeralMessage } = usePeerToPeerCommunication();

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const bottomSheetRef = React.useRef<?BottomSheetRef>();
  const removeDeviceContainerRef =
    React.useRef<?React.ElementRef<typeof View>>();

  const styles = useStyles(unboundStyles);
  const insets = useSafeAreaInsets();

  // This state is on purpose never set to false, to avoid case when
  // this state is flipped before Bottom Sheet is closed, which is
  // terrible for UX. When trying to remove device again,
  // a new component is rendered with the default state
  // value `false`.
  const [removingInProgress, setRemovingInProgress] = React.useState(false);

  const handleDeviceRemoval = React.useCallback(async () => {
    setRemovingInProgress(true);
    try {
      const authMetadata = await getAuthMetadata();
      const { userID } = authMetadata;
      if (!userID) {
        throw new Error('No user ID');
      }

      await runDeviceListUpdate({
        type: 'remove',
        deviceID,
      });

      const messageContents: DeviceLogoutP2PMessage = {
        type: userActionsP2PMessageTypes.LOG_OUT_DEVICE,
      };

      await broadcastEphemeralMessage(
        JSON.stringify(messageContents),
        [{ userID, deviceID }],
        authMetadata,
      );
    } catch (e) {
      console.log('Removing device failed:', e);
      Alert.alert(
        'Removing device failed',
        'Failed to update the device list',
        [{ text: 'OK' }],
      );
    } finally {
      bottomSheetRef.current?.close();
    }
  }, [
    getAuthMetadata,
    broadcastEphemeralMessage,
    deviceID,
    runDeviceListUpdate,
  ]);

  const confirmDeviceRemoval = React.useCallback(() => {
    Alert.alert(
      'Remove device',
      'Are you sure you want to remove this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: handleDeviceRemoval },
      ],
      { cancelable: true },
    );
  }, [handleDeviceRemoval]);

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

  const colors = useColors();

  const removeDeviceButton = React.useMemo(() => {
    if (!shouldDisplayRemoveButton) {
      return null;
    }

    let style, content;
    if (removingInProgress) {
      style = [styles.buttonContainer, styles.disabledButton];
      content = (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={colors.panelForegroundLabel} />
        </View>
      );
    } else {
      style = [styles.buttonContainer, styles.removeButton];
      content = <Text style={styles.removeButtonText}>Remove device</Text>;
    }

    return (
      <Button
        style={style}
        onPress={confirmDeviceRemoval}
        disabled={removingInProgress}
      >
        {content}
      </Button>
    );
  }, [
    colors.panelForegroundLabel,
    confirmDeviceRemoval,
    removingInProgress,
    shouldDisplayRemoveButton,
    styles.buttonContainer,
    styles.disabledButton,
    styles.removeButton,
    styles.removeButtonText,
    styles.spinner,
  ]);

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
  buttonContainer: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: 'vibrantRedButton',
  },
  disabledButton: {
    backgroundColor: 'disabledButton',
  },
  removeButtonText: {
    color: 'floatingButtonLabel',
    fontSize: 16,
  },
  spinner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default LinkedDevicesBottomSheet;
