// @flow

import * as React from 'react';
import { View } from 'react-native';

import { ancestorThreadInfos } from 'lib/selectors/thread-selectors';
import { type ThreadInfo } from 'lib/types/thread-types';

import ThreadAncestors from '../../components/thread-ancestors.react';
import { useSelector } from '../../redux/redux-utils';
import { useStyles } from '../../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
|};
function ThreadSettingsAncestors(props: Props) {
  const styles = useStyles(unboundStyles);

  const { threadInfo } = props;
  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector(
    ancestorThreadInfos(threadInfo.id),
  );

  return (
    <View style={styles.cell}>
      <ThreadAncestors ancestorThreads={ancestorThreads} />
    </View>
  );
}

const unboundStyles = {
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'panelForeground',
  },
};

export default ThreadSettingsAncestors;
