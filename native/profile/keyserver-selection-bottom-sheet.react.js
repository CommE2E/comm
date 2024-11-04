// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setCustomServerActionType } from 'lib/actions/custom-server-actions.js';
import { removeKeyserverActionType } from 'lib/actions/keyserver-actions.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import Button from '../components/button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
import type { BottomSheetRef } from '../types/bottom-sheet.js';
import Alert from '../utils/alert.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

export type KeyserverSelectionBottomSheetParams = {
  +keyserverAdminUserInfo: GlobalAccountUserInfo,
  +keyserverInfo: KeyserverInfo,
};

type Props = {
  +navigation: RootNavigationProp<'KeyserverSelectionBottomSheet'>,
  +route: NavigationRoute<'KeyserverSelectionBottomSheet'>,
};

function KeyserverSelectionBottomSheet(props: Props): React.Node {
  const {
    navigation,
    route: {
      params: { keyserverAdminUserInfo, keyserverInfo },
    },
  } = props;

  const { goBack } = navigation;

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const containerRef = React.useRef<?React.ElementRef<typeof View>>();
  const bottomSheetRef = React.useRef<?BottomSheetRef>();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const insets = useSafeAreaInsets();

  const onLayout = React.useCallback(() => {
    containerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (
        height === null ||
        height === undefined ||
        pageY === null ||
        pageY === undefined
      ) {
        return;
      }

      setContentHeight(height + insets.bottom);
    });
  }, [insets.bottom, setContentHeight]);

  const cloudIcon = React.useMemo(
    () => (
      <CommIcon
        name="cloud-filled"
        size={12}
        color={colors.panelForegroundLabel}
      />
    ),
    [colors.panelForegroundLabel],
  );

  const onPressDisconnectKeyserver = React.useCallback(() => {
    // TODO: update this function when we have a way to
    // disconnect from a keyserver
    Alert.alert(
      'Disconnecting from a keyserver is still not ready.',
      'Please come back later.',
      [{ text: 'OK' }],
    );
  }, []);

  const staffCanSee = useStaffCanSee();

  const dispatch = useDispatch();

  const onDeleteKeyserver = React.useCallback(() => {
    dispatch({
      type: removeKeyserverActionType,
      payload: {
        keyserverAdminUserID: keyserverAdminUserInfo.id,
      },
    });

    if (staffCanSee) {
      dispatch({
        type: setCustomServerActionType,
        payload: keyserverInfo.urlPrefix,
      });
    }
    bottomSheetRef.current?.close();
  }, [
    dispatch,
    keyserverAdminUserInfo.id,
    keyserverInfo.urlPrefix,
    staffCanSee,
  ]);

  const onPressRemoveKeyserver = React.useCallback(() => {
    Alert.alert(
      'Delete keyserver',
      'Are you sure you want to delete this keyserver from your keyserver ' +
        'list? You will still remain in the associated communities.',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDeleteKeyserver,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }, [onDeleteKeyserver]);

  const removeKeyserver = React.useMemo(() => {
    if (keyserverInfo.connection.status !== 'connected') {
      return (
        <>
          <Text style={styles.keyserverRemoveText}>
            You may delete offline keyservers from your keyserver list. When you
            delete a keyserver, you will still remain in the associated
            communities.
          </Text>
          <Text style={styles.keyserverRemoveText}>
            Any messages or content you have previously sent will remain on the
            keyserver&rsquo;s communities after disconnecting or deleting.
          </Text>
          <Button
            style={styles.removeButtonContainer}
            onPress={onPressRemoveKeyserver}
          >
            <Text style={styles.removeButtonText}>
              Delete keyserver from list
            </Text>
          </Button>
        </>
      );
    }
    return (
      <>
        <Text style={styles.keyserverRemoveText}>
          Disconnecting from this keyserver will remove you from its associated
          communities.
        </Text>
        <Text style={styles.keyserverRemoveText}>
          Any messages or content you have previously sent will remain on the
          keyserver.
        </Text>
        <Button
          style={styles.removeButtonContainer}
          onPress={onPressDisconnectKeyserver}
        >
          <Text style={styles.removeButtonText}>Disconnect keyserver</Text>
        </Button>
      </>
    );
  }, [
    keyserverInfo.connection.status,
    onPressDisconnectKeyserver,
    onPressRemoveKeyserver,
    styles.keyserverRemoveText,
    styles.removeButtonContainer,
    styles.removeButtonText,
  ]);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      <View style={styles.container} ref={containerRef} onLayout={onLayout}>
        <View style={styles.keyserverDetailsContainer}>
          <View style={styles.keyserverHeaderContainer}>
            <View style={styles.keyserverPillContainer}>
              <Pill
                label={keyserverAdminUserInfo.username}
                backgroundColor={colors.codeBackground}
                icon={cloudIcon}
              />
            </View>
            <View style={styles.statusIndicatorContainer}>
              <StatusIndicator connectionInfo={keyserverInfo.connection} />
            </View>
          </View>
          <Text style={styles.keyserverURLText}>{keyserverInfo.urlPrefix}</Text>
        </View>
        {removeKeyserver}
      </View>
    </BottomSheet>
  );
}

const unboundStyles = {
  container: {
    paddingHorizontal: 16,
  },
  keyserverDetailsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'modalAccentBackground',
    marginBottom: 24,
    borderRadius: 8,
  },
  keyserverHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyserverPillContainer: {
    flex: 1,
    alignItems: 'baseline',
  },
  statusIndicatorContainer: {
    marginLeft: 24,
  },
  keyserverURLText: {
    color: 'modalForegroundLabel',
    marginTop: 8,
  },
  keyserverRemoveText: {
    color: 'modalForegroundLabel',
    marginBottom: 24,
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

export default KeyserverSelectionBottomSheet;
