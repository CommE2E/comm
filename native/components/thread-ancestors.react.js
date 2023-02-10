// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ancestorThreadInfos } from 'lib/selectors/thread-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import { useNavigateToThread } from '../chat/message-list-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import Button from './button.react.js';
import CommunityPill from './community-pill.react.js';
import ThreadPill from './thread-pill.react.js';

type Props = {
  +threadInfo: ThreadInfo,
};

function ThreadAncestors(props: Props): React.Node {
  const { threadInfo } = props;
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector(
    ancestorThreadInfos(threadInfo.id),
  );

  const rightArrow = React.useMemo(
    () => (
      <Icon
        name="chevron-right"
        size={12}
        color={colors.panelForegroundLabel}
        style={unboundStyles.arrowIcon}
      />
    ),
    [colors.panelForegroundLabel],
  );

  const navigateToThread = useNavigateToThread();
  const pathElements = React.useMemo(() => {
    const elements = [];
    for (const [idx, ancestorThreadInfo] of ancestorThreads.entries()) {
      const isLastThread = idx === ancestorThreads.length - 1;
      const pill =
        idx === 0 ? (
          <CommunityPill community={ancestorThreadInfo} />
        ) : (
          <ThreadPill threadInfo={ancestorThreadInfo} />
        );
      elements.push(
        <View key={ancestorThreadInfo.id} style={styles.pathItem}>
          <Button
            style={styles.row}
            onPress={() => navigateToThread({ threadInfo: ancestorThreadInfo })}
          >
            {pill}
          </Button>
          {!isLastThread ? rightArrow : null}
        </View>,
      );
    }
    return <View style={styles.pathItem}>{elements}</View>;
  }, [
    ancestorThreads,
    navigateToThread,
    rightArrow,
    styles.pathItem,
    styles.row,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsHorizontalScrollIndicator={false}
        horizontal={true}
      >
        {pathElements}
      </ScrollView>
    </View>
  );
}

const height = 48;
const unboundStyles = {
  arrowIcon: {
    paddingHorizontal: 8,
  },
  container: {
    height,
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
  },
  contentContainer: {
    paddingHorizontal: 12,
  },
  pathItem: {
    alignItems: 'center',
    flexDirection: 'row',
    height,
  },
  row: {
    flexDirection: 'row',
  },
};

export default ThreadAncestors;
