// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { KeyserverInfo } from 'lib/types/keyserver-types.js';

import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import Button from '../components/button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import StatusIndicator from '../components/status-indicator.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';

export type KeyserverSelectionBottomSheetParams = {
  +keyserverAdminUsername: string,
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
      params: { keyserverAdminUsername, keyserverInfo },
    },
  } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

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
              label={keyserverAdminUsername}
              backgroundColor={colors.codeBackground}
              icon={cloudIcon}
            />
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
