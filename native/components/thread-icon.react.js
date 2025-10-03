// @flow

import EntypoIcon from '@expo/vector-icons/Entypo.js';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { threadTypeIsSidebar } from 'lib/shared/threads/thread-specs.js';
import { threadTypes, type ThreadType } from 'lib/types/thread-types-enum.js';

import SWMansionIcon from './swmansion-icon.react.js';
import FarcasterLogo from '../vectors/farcaster-logo.react.js';

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
  } else if (threadTypeIsSidebar(threadType)) {
    return (
      <EntypoIcon
        name="align-right"
        size={20}
        color={color}
        style={styles.sidebarIcon}
      />
    );
  } else if (threadType === threadTypes.GENESIS_PERSONAL) {
    return <SWMansionIcon name="users" size={18} color={color} />;
  } else if (
    threadType === threadTypes.FARCASTER_GROUP ||
    threadType === threadTypes.FARCASTER_PERSONAL
  ) {
    return (
      <View style={styles.farcasterIcon}>
        <FarcasterLogo size={14} />
      </View>
    );
  } else {
    return <SWMansionIcon name="lock-on" size={18} color={color} />;
  }
}

const styles = StyleSheet.create({
  farcasterIcon: {
    alignItems: 'center',
    backgroundColor: '#855DCD',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    opacity: 0.7,
    width: 18,
  },
  sidebarIcon: {
    paddingTop: 2,
  },
});

export default ThreadIcon;
