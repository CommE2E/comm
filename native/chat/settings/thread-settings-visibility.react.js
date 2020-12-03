// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import * as React from 'react';
import { Text, View } from 'react-native';

import ThreadVisibility from '../../components/thread-visibility.react';
import { useStyles, useColors } from '../../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
|};
function ThreadSettingsVisibility(props: Props) {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Visibility</Text>
      <ThreadVisibility
        threadType={props.threadInfo.type}
        color={colors.panelForegroundSecondaryLabel}
      />
    </View>
  );
}

const unboundStyles = {
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
};

export default ThreadSettingsVisibility;
