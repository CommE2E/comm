// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import { useColors, useStyles } from '../themes/colors.js';

function CommunityCreationKeyserverLabel(): React.Node {
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

  return (
    <View style={styles.keyserverRowContainer}>
      <Text style={styles.withinText}>within</Text>
      <Pill
        label="ashoat"
        backgroundColor={colors.codeBackground}
        icon={cloudIcon}
      />
    </View>
  );
}

const unboundStyles = {
  keyserverRowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    height: 48,
    borderColor: 'panelForegroundBorder',
    borderBottomWidth: 1,
  },
  withinText: {
    color: 'panelForegroundLabel',
    fontSize: 14,
    marginRight: 6,
  },
};

export default CommunityCreationKeyserverLabel;
