// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import { memberHasAdminPowers } from 'lib/shared/thread-utils';
import { type ThreadInfo, type MemberInfo } from 'lib/types/thread-types';

import { MessageListRouteName } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { useColors } from '../themes/colors';
import Button from './button.react';
import Pill from './pill.react';

type Props = {|
  +ancestorThreads: $ReadOnlyArray<ThreadInfo>,
|};

function ThreadAncestors(props: Props): React.Node {
  const { ancestorThreads } = props;
  const navigation = useNavigation();
  const colors = useColors();
  const userInfos = useSelector((state) => state.userStore.userInfos);

  const navigateToThread = React.useCallback(
    (threadInfo) => {
      navigation.navigate({
        name: MessageListRouteName,
        params: { threadInfo },
        key: `${MessageListRouteName}${threadInfo.id}`,
      });
    },
    [navigation],
  );

  const parentAdmin: ?string = React.useMemo(() => {
    for (const member: MemberInfo of ancestorThreads[0].members) {
      if (memberHasAdminPowers(member)) {
        return userInfos[member.id].username;
      }
    }
  }, [ancestorThreads, userInfos]);

  const adminLabel: ?React.Node = React.useMemo(() => {
    if (!parentAdmin) {
      return undefined;
    }
    return (
      <Pill
        backgroundColor={colors.codeBackground}
        roundCorners={{ left: true, right: false }}
        label={parentAdmin}
        faIcon="cloud"
      />
    );
  }, [colors.codeBackground, parentAdmin]);

  const pathElements = React.useMemo(() => {
    const elements = [];
    for (const [idx, threadInfo] of ancestorThreads.entries()) {
      const isLastThread = idx === ancestorThreads.length - 1;
      const backgroundColor = `#${threadInfo.color}`;

      elements.push(
        <View key={threadInfo.id} style={styles.pathItem}>
          <Button
            style={styles.row}
            onPress={() => navigateToThread(threadInfo)}
          >
            {idx === 0 ? adminLabel : null}
            <Pill
              backgroundColor={backgroundColor}
              roundCorners={{ left: !(idx === 0), right: true }}
              label={threadInfo.uiName}
            />
          </Button>
          {!isLastThread ? rightArrow : null}
        </View>,
      );
    }
    return <View style={styles.pathItem}>{elements}</View>;
  }, [adminLabel, ancestorThreads, navigateToThread]);

  return <ScrollView horizontal={true}>{pathElements}</ScrollView>;
}

const styles = StyleSheet.create({
  arrowIcon: {
    paddingHorizontal: 8,
  },
  pathItem: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
  },
  row: {
    flexDirection: 'row',
  },
});

const rightArrow: React.Node = (
  <Icon name="chevron-right" size={12} color="white" style={styles.arrowIcon} />
);

export default ThreadAncestors;
