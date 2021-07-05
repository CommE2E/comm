// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import genesis from 'lib/facts/genesis';
import {
  threadInfoSelector,
  ancestorThreadInfos,
} from 'lib/selectors/thread-selectors';
import { threadIsPending } from 'lib/shared/thread-utils';
import { type ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { useColors, useStyles } from '../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
  +unread: ?boolean,
|};
function ThreadAncestorsLabel(props: Props): React.Node {
  const { unread, threadInfo } = props;
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector((state) => {
    if (!threadIsPending(threadInfo.id)) {
      return ancestorThreadInfos(threadInfo.id)(state).slice(0, -1);
    }
    const genesisThreadInfo = threadInfoSelector(state)[genesis.id];
    return genesisThreadInfo ? [genesisThreadInfo] : [];
  });

  const chevronIcon = React.useMemo(
    () => (
      <Icon
        name="chevron-right"
        size={8}
        color={colors.listForegroundTertiaryLabel}
      />
    ),
    [colors.listForegroundTertiaryLabel],
  );

  const ancestorPath = React.useMemo(() => {
    const path = [];
    for (const thread of ancestorThreads) {
      path.push(<Text key={thread.id}>{thread.uiName}</Text>);
      path.push(
        <View key={`>${thread.id}`} style={styles.chevron}>
          {chevronIcon}
        </View>,
      );
    }
    path.pop();
    return path;
  }, [ancestorThreads, chevronIcon, styles.chevron]);

  const ancestorPathStyle = React.useMemo(() => {
    return unread ? [styles.pathText, styles.unread] : styles.pathText;
  }, [styles.pathText, styles.unread, unread]);

  if (!ancestorPath) {
    return null;
  }

  return (
    <Text numberOfLines={1} style={ancestorPathStyle}>
      {ancestorPath}
    </Text>
  );
}

const unboundStyles = {
  pathText: {
    opacity: 0.8,
    fontSize: 12,
    color: 'listForegroundTertiaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
  chevron: {
    paddingHorizontal: 3,
  },
};

export default ThreadAncestorsLabel;
