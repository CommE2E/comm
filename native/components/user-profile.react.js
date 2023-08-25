// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import type { AccountUserInfo } from 'lib/types/user-types';
import sleep from 'lib/utils/sleep.js';

import SWMansionIcon from './swmansion-icon.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +userInfo: AccountUserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const [usernameCopied, setUsernameCopied] = React.useState<boolean>(false);

  const styles = useStyles(unboundStyles);

  const onPressCopyUsername = React.useCallback(async () => {
    Clipboard.setString(userInfo.username);
    setUsernameCopied(true);
    await sleep(3000);
    setUsernameCopied(false);
  }, [userInfo.username]);

  const copyUsernameButton = React.useMemo(() => {
    if (usernameCopied) {
      return (
        <View style={styles.copyUsernameContainer}>
          <SWMansionIcon
            name="check"
            style={styles.copyUsernameIcon}
            size={16}
          />
          <Text style={styles.copyUsernameText}>Username copied!</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.copyUsernameContainer}
        onPress={onPressCopyUsername}
      >
        <SWMansionIcon name="copy" style={styles.copyUsernameIcon} size={16} />
        <Text style={styles.copyUsernameText}>Copy username</Text>
      </TouchableOpacity>
    );
  }, [
    onPressCopyUsername,
    styles.copyUsernameContainer,
    styles.copyUsernameIcon,
    styles.copyUsernameText,
    usernameCopied,
  ]);

  return (
    <View style={styles.container}>
      <SWMansionIcon name="menu-vertical" size={24} style={styles.moreIcon} />
      <View style={styles.userInfoContainer}>
        <UserAvatar size="profile" userID={userInfo.id} />
        <View style={styles.usernameContainer}>
          <Text style={styles.usernameText}>{userInfo.username}</Text>
          {copyUsernameButton}
        </View>
      </View>
    </View>
  );
}

const unboundStyles = {
  container: {
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
