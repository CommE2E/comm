// @flow

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import { memberHasAdminPowers } from 'lib/shared/thread-utils';
import { type ThreadInfo, type MemberInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { useStyles, useColors } from '../themes/colors';
import Pill from './pill.react';

type Props = {|
  +ancestorThreads: $ReadOnlyArray<ThreadInfo>,
|};

function ThreadAncestors(props: Props): React.Node {
  const { ancestorThreads } = props;
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const userInfos = useSelector((state) => state.userStore.userInfos);

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

  const rightArrow: React.Node = React.useMemo(
    () => (
      <Icon
        name="chevron-right"
        size={12}
        color="white"
        style={styles.arrowIcon}
      />
    ),
    [styles.arrowIcon],
  );

  const pathElements = [];
  for (const [idx, threadInfo] of ancestorThreads.entries()) {
    const isLastThread = idx === ancestorThreads.length - 1;
    const backgroundColor = `#${threadInfo.color}`;

    pathElements.push(
      <View key={threadInfo.id} style={styles.pathItem}>
        {idx === 0 ? adminLabel : null}
        <Pill
          backgroundColor={backgroundColor}
          roundCorners={{ left: !(idx === 0), right: true }}
          label={threadInfo.uiName}
        />
        {!isLastThread ? rightArrow : null}
      </View>,
    );
  }
  return (
    <ScrollView horizontal={true}>
      <View style={styles.pathItem}>{pathElements}</View>
    </ScrollView>
  );
}

const unboundStyles = {
  pathItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  arrowIcon: {
    paddingHorizontal: 8,
  },
};

export default ThreadAncestors;
