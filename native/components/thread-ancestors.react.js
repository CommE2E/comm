// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import { ancestorThreadInfos } from 'lib/selectors/thread-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { MessageListRouteName } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';
import Button from './button.react';
import CommunityPill from './community-pill.react';
import ThreadPill from './thread-pill.react';

type Props = {|
  +threadInfo: ThreadInfo,
|};

function ThreadAncestors(props: Props): React.Node {
  const { threadInfo } = props;
  const navigation = useNavigation();
  const styles = useStyles(unboundStyles);

  const ancestorThreads: $ReadOnlyArray<ThreadInfo> = useSelector(
    ancestorThreadInfos(threadInfo.id),
  );

  const navigateToThread = React.useCallback(
    (ancestorThreadInfo) => {
      navigation.navigate({
        name: MessageListRouteName,
        params: { threadInfo: ancestorThreadInfo },
        key: `${MessageListRouteName}${ancestorThreadInfo.id}`,
      });
    },
    [navigation],
  );

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
            onPress={() => navigateToThread(ancestorThreadInfo)}
          >
            {pill}
          </Button>
          {!isLastThread ? rightArrow : null}
        </View>,
      );
    }
    return <View style={styles.pathItem}>{elements}</View>;
  }, [ancestorThreads, navigateToThread, styles.pathItem, styles.row]);

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
    backgroundColor: 'panelSecondaryForeground',
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

const rightArrow: React.Node = (
  <Icon
    name="chevron-right"
    size={12}
    color="white"
    style={unboundStyles.arrowIcon}
  />
);

export default ThreadAncestors;
