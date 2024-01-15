// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import ThreadVisibility from '../../components/thread-visibility.react.js';
import { useColors, useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
};
function ThreadSettingsVisibility(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Visibility</Text>
      <ThreadVisibility
        threadType={props.threadInfo.type}
        color={colors.codeBackground}
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
    paddingVertical: 4,
    alignItems: 'center',
  },
};

export default ThreadSettingsVisibility;
