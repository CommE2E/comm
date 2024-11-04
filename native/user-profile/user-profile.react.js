// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useENSName } from 'lib/hooks/ens-cache.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import { useUserProfileThreadInfo } from 'lib/shared/thread-utils.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { UserInfo } from 'lib/types/user-types';
import sleep from 'lib/utils/sleep.js';

import UserProfileAvatar from './user-profile-avatar.react.js';
import {
  userProfileUserInfoContainerHeight,
  userProfileMenuButtonHeight,
  userProfileActionButtonHeight,
} from './user-profile-constants.js';
import UserProfileMenuButton from './user-profile-menu-button.react.js';
import UserProfileMessageButton from './user-profile-message-button.react.js';
import UserProfileRelationshipButton from './user-profile-relationship-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import SingleLine from '../components/single-line.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +userInfo: ?UserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const userProfileThreadInfo = useUserProfileThreadInfo(userInfo);

  const usernameText = stringForUserExplicit(userInfo);
  const resolvedUsernameText = useENSName(usernameText);

  const [usernameCopied, setUsernameCopied] = React.useState<boolean>(false);

  const [
    userProfileRelationshipButtonHeight,
    setUserProfileRelationshipButtonHeight,
  ] = React.useState<number>(0);

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');

  const { setContentHeight } = bottomSheetContext;

  const insets = useSafeAreaInsets();

  React.useLayoutEffect(() => {
    let height = insets.bottom + userProfileUserInfoContainerHeight;

    if (userProfileThreadInfo) {
      height += userProfileMenuButtonHeight;
    }

    if (
      userProfileThreadInfo &&
      !relationshipBlockedInEitherDirection(userInfo?.relationshipStatus)
    ) {
      // message button height + relationship button height
      height +=
        userProfileActionButtonHeight + userProfileRelationshipButtonHeight;
    }

    setContentHeight(height);
  }, [
    insets.bottom,
    setContentHeight,
    userInfo?.relationshipStatus,
    userProfileRelationshipButtonHeight,
    userProfileThreadInfo,
  ]);

  const styles = useStyles(unboundStyles);

  const menuButton = React.useMemo(() => {
    if (!userProfileThreadInfo) {
      return null;
    }

    const { threadInfo, pendingPersonalThreadUserInfo } = userProfileThreadInfo;
    return (
      <UserProfileMenuButton
        threadInfo={threadInfo}
        pendingPersonalThreadUserInfo={pendingPersonalThreadUserInfo}
      />
    );
  }, [userProfileThreadInfo]);

  const onPressCopyUsername = React.useCallback(async () => {
    Clipboard.setString(resolvedUsernameText);
    setUsernameCopied(true);
    await sleep(3000);
    setUsernameCopied(false);
  }, [resolvedUsernameText]);

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

  const messageButton = React.useMemo(() => {
    if (
      !userProfileThreadInfo ||
      relationshipBlockedInEitherDirection(userInfo?.relationshipStatus)
    ) {
      return null;
    }

    const { threadInfo, pendingPersonalThreadUserInfo } = userProfileThreadInfo;
    return (
      <UserProfileMessageButton
        threadInfo={threadInfo}
        pendingPersonalThreadUserInfo={pendingPersonalThreadUserInfo}
      />
    );
  }, [userInfo?.relationshipStatus, userProfileThreadInfo]);

  const relationshipButton = React.useMemo(() => {
    if (
      !userProfileThreadInfo ||
      relationshipBlockedInEitherDirection(userInfo?.relationshipStatus)
    ) {
      return null;
    }

    const { threadInfo, pendingPersonalThreadUserInfo } = userProfileThreadInfo;
    return (
      <UserProfileRelationshipButton
        threadInfo={threadInfo}
        pendingPersonalThreadUserInfo={pendingPersonalThreadUserInfo}
        setUserProfileRelationshipButtonHeight={
          setUserProfileRelationshipButtonHeight
        }
      />
    );
  }, [userInfo?.relationshipStatus, userProfileThreadInfo]);

  return (
    <View style={styles.container}>
      {menuButton}
      <View style={styles.userInfoContainer}>
        <UserProfileAvatar userID={userInfo?.id} />
        <View style={styles.usernameContainer}>
          <SingleLine style={styles.usernameText}>
            {resolvedUsernameText}
          </SingleLine>
          {copyUsernameButton}
        </View>
      </View>
      {messageButton}
      {relationshipButton}
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingHorizontal: 16,
  },
  userInfoContainer: {
    flexDirection: 'row',
  },
  usernameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  messageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'purpleButton',
    paddingVertical: 8,
    marginTop: 16,
    borderRadius: 8,
  },
  messageButtonIcon: {
    color: 'floatingButtonLabel',
    paddingRight: 8,
  },
  messageButtonText: {
    color: 'floatingButtonLabel',
  },
};

export default UserProfile;
