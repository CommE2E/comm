// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types';

import ThreadAncestors from '../../components/thread-ancestors.react';
import { useStyles } from '../../themes/colors';

type Props = {|
  +ancestorThreads: $ReadOnlyArray<ThreadInfo>,
|};
function ThreadSettingsAncestors(props: Props) {
  const { ancestorThreads } = props;
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.cell}>
      <Text style={styles.label}>Path</Text>
      <ThreadAncestors ancestorThreads={ancestorThreads} />
    </View>
  );
}

const unboundStyles = {
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'panelForeground',
  },
  label: {
    fontSize: 16,
    width: 96,
    color: 'panelForegroundTertiaryLabel',
  },
};

export default ThreadSettingsAncestors;
