// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { AccountUserInfo } from 'lib/types/user-types';

import SWMansionIcon from './swmansion-icon.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +userInfo: AccountUserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.container}>
      <SWMansionIcon name="menu-vertical" size={24} style={styles.moreIcon} />
      <View style={styles.userInfoContainer}>
        <UserAvatar size="profile" userID={userInfo.id} />
        <View style={styles.usernameContainer}>
          <Text style={styles.usernameText}>{userInfo.username}</Text>
          <View style={styles.copyUsernameContainer}>
            <SWMansionIcon
              name="copy"
              style={styles.copyUsernameIcon}
              size={16}
            />
            <Text style={styles.copyUsernameText}>Copy username</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'modalForeground',
    paddingHorizontal: 16,
  },
  moreIcon: {
    color: 'modalButtonLabel',
    alignSelf: 'flex-end',
  },
  userInfoContainer: {
    flexDirection: 'row',
  },
  usernameContainer: {
    justifyContent: 'center',
    paddingLeft: 16,
  },
  usernameText: {
    color: 'modalForegroundLabel',
    fontSize: 18,
    fontWeight: '500',
  },
  copyUsernameContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 8,
  },
  copyUsernameIcon: {
    color: 'purpleLink',
    marginRight: 4,
  },
  copyUsernameText: {
    color: 'purpleLink',
    fontSize: 12,
  },
};

export default UserProfile;
