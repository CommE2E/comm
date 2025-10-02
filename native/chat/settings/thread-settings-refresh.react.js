// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';

import Button from '../../components/button.react.js';
import { useStyles } from '../../themes/colors.js';

const unboundStyles = {
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  icon: {
    lineHeight: 20,
  },
  refreshButton: {
    paddingTop: Platform.OS === 'ios' ? 4 : 1,
  },
  refreshIcon: {
    color: 'panelForegroundSecondaryLabel',
  },
  refreshRow: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  refreshText: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
  },
  disabled: {
    color: 'disabledButtonText',
  },
};

type RefreshProps = {
  +onPress: () => Promise<void>,
};

function ThreadSettingsRefresh(props: RefreshProps): React.Node {
  const styles = useStyles(unboundStyles);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const onPressWrapper = React.useCallback(async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      await props.onPress();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, props]);

  const disabledStyle = isRefreshing ? styles.disabled : null;

  return (
    <View style={styles.refreshRow}>
      <Button
        onPress={onPressWrapper}
        style={styles.refreshButton}
        disabled={isRefreshing}
      >
        <View style={styles.container}>
          <Text style={[styles.refreshText, disabledStyle]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh thread'}
          </Text>
          <Icon
            name="refresh"
            size={20}
            style={[styles.icon, styles.refreshIcon, disabledStyle]}
          />
        </View>
      </Button>
    </View>
  );
}

export default ThreadSettingsRefresh;
