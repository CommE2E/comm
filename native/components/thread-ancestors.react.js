// @flow

import * as React from 'react';
import { Text, View, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

import { memberHasAdminPowers } from 'lib/shared/thread-utils';
import { type ThreadInfo, type MemberInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';

type Props = {|
  +ancestorThreads: $ReadOnlyArray<ThreadInfo>,
|};

function ThreadAncestors(props: Props) {
  const { ancestorThreads } = props;
  const styles = useStyles(unboundStyles);
  const userInfos = useSelector((state) => state.userStore.userInfos);

  const parentAdmin: ?string = React.useMemo(() => {
    for (const member: MemberInfo of ancestorThreads[0].members) {
      if (memberHasAdminPowers(member)) {
        return userInfos[member.id].username;
      }
    }
  }, [ancestorThreads, userInfos]);

  const pathElements = [];
  for (const [idx, threadInfo] of ancestorThreads.entries()) {
    if (idx === ancestorThreads.length - 1) {
      pathElements.push(
        <View key={threadInfo.id} style={styles.pathItem}>
          <Text style={styles.pathLabel}>{threadInfo.uiName}</Text>
        </View>,
      );
    } else {
      pathElements.push(
        <View key={threadInfo.id} style={styles.pathItem}>
          <Text style={styles.pathLabel}>{threadInfo.uiName}</Text>
          <Icon
            name="chevron-right"
            size={12}
            color="white"
            style={styles.arrowIcon}
          />
        </View>,
      );
    }
  }

  let adminLabel;
  if (parentAdmin) {
    adminLabel = (
      <View style={styles.adminBadge}>
        <Icon name="cloud" size={12} color="white" style={styles.cloudIcon} />
        <Text style={styles.adminName}>{parentAdmin}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal={true}>
      <View style={styles.pathItem}>
        {adminLabel}
        {pathElements}
      </View>
    </ScrollView>
  );
}

const unboundStyles = {
  adminBadge: {
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'codeBackground',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'panelForegroundLabel',
  },
  pathItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  pathLabel: {
    fontSize: 16,
    paddingLeft: 8,
    fontWeight: 'bold',
    color: 'panelForegroundSecondaryLabel',
  },
  cloudIcon: {
    paddingRight: 8,
  },
  arrowIcon: {
    paddingLeft: 8,
  },
};

export default ThreadAncestors;
