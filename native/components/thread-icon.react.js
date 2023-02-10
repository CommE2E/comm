// @flow

import EntypoIcon from '@expo/vector-icons/Entypo.js';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { threadTypes, type ThreadType } from 'lib/types/thread-types.js';

import SWMansionIcon from './swmansion-icon.react.js';

type Props = {
  +threadType: ThreadType,
  +color: string,
};
function ThreadIcon(props: Props): React.Node {
  const { threadType, color } = props;
  if (
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD
  ) {
    return <SWMansionIcon name="globe-1" size={18} color={color} />;
  } else if (threadType === threadTypes.SIDEBAR) {
    return (
      <EntypoIcon
        name="align-right"
        size={20}
        color={color}
        style={styles.sidebarIcon}
      />
    );
  } else if (threadType === threadTypes.PERSONAL) {
    return <SWMansionIcon name="users" size={18} color={color} />;
  } else {
    return <SWMansionIcon name="lock-on" size={18} color={color} />;
  }
}

const styles = StyleSheet.create({
  sidebarIcon: {
    paddingTop: 2,
  },
});

export default ThreadIcon;
