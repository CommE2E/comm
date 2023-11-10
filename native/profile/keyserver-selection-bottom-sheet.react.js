// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import type { GlobalAccountUserInfo } from 'lib/types/user-types.js';

import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import Button from '../components/button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

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

  const removeKeyserverContainerRef = React.useRef();
  const bottomSheetRef = React.useRef();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const insets = useSafeAreaInsets();

  const onLayout = React.useCallback(() => {
    removeKeyserverContainerRef.current?.measure(
      (x, y, width, height, pageX, pageY) => {
        if (
          height === null ||
          height === undefined ||
          pageY === null ||
          pageY === undefined
        ) {
          return;
        }
        // header + paddingTop + paddingBottom + marginBottom
        const keyserverHeaderHeight = 85 + 16 + 16 + 24;

        setContentHeight(height + keyserverHeaderHeight + insets.bottom);
      },
    );
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

  const onPressRemoveKeyserver = React.useCallback(() => {
    // TODO
  }, []);

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
          onPress={onPressRemoveKeyserver}
        >
          <Text style={styles.removeButtonText}>Disconnect keyserver</Text>
        </Button>
      </>
    );
  }, [
    keyserverInfo.connection.status,
    onPressRemoveKeyserver,
    styles.keyserverRemoveText,
    styles.removeButtonContainer,
    styles.removeButtonText,
  ]);

  return (
    <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
      <View style={styles.container}>
        <View style={styles.keyserverDetailsContainer}>
          <View style={styles.keyserverHeaderContainer}>
            <Pill
              label={keyserverAdminUserInfo.username}
              backgroundColor={colors.codeBackground}
              icon={cloudIcon}
            />
            <View style={styles.statusIndicatorContainer}>
              <StatusIndicator connectionInfo={keyserverInfo.connection} />
            </View>
          </View>
          <Text style={styles.keyserverURLText}>{keyserverInfo.urlPrefix}</Text>
        </View>
        <View ref={removeKeyserverContainerRef} onLayout={onLayout}>
          {removeKeyserver}
        </View>
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
    paddingVertical: 16,
    backgroundColor: 'panelBackgroundAccent',
    marginBottom: 24,
    borderRadius: 8,
  },
  keyserverHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicatorContainer: {
    marginLeft: 8,
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
