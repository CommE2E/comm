// @flow

import { threadTypes, type ThreadType } from 'lib/types/thread-types';

import * as React from 'react';
import { StyleSheet } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import EntypoIcon from 'react-native-vector-icons/Entypo';

type Props = {|
  +threadType: ThreadType,
  +color: string,
|};
function ThreadIcon(props: Props) {
  const { threadType, color } = props;
  if (threadType === threadTypes.CHAT_SECRET) {
    return <MaterialIcon name="lock-outline" size={18} color={color} />;
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
    return <MaterialIcon name="people" size={18} color={color} />;
  } else {
    return <MaterialIcon name="public" size={18} color={color} />;
  }
}

const styles = StyleSheet.create({
  sidebarIcon: {
    paddingTop: 2,
  },
});

export default ThreadIcon;
