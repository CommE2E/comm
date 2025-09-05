// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useUserProfileThreadInfo } from 'lib/shared/thread-utils.js';
import type { ProfileUserInfo } from 'lib/types/user-types.js';

import UserProfileMenu from './user-profile-menu.react.js';
import UserProfile from './user-profile.react.js';
import { useSelector } from '../../redux/redux-utils.js';
import Modal from '../modal.react.js';

type Props = {
  +userID: string,
};

function UserProfileModal(props: Props): React.Node {
  const { userID } = props;

  const { popModal } = useModalContext();

  const userInfo: ?ProfileUserInfo = useSelector(
    state => state.userStore.userInfos[userID],
  );

  const userProfileThreadInfo = useUserProfileThreadInfo(userInfo);

  const menuButton = React.useMemo(() => {
    if (!userProfileThreadInfo) {
      // The case for anonymous users
      return null;
    }
    return <UserProfileMenu threadInfo={userProfileThreadInfo.threadInfo} />;
  }, [userProfileThreadInfo]);

  const userProfileModal = React.useMemo(
    () => (
      <Modal
        size="fit-content"
        onClose={popModal}
        secondaryHeaderButton={menuButton}
      >
        <UserProfile
          userInfo={userInfo}
          userProfileThreadInfo={userProfileThreadInfo}
        />
      </Modal>
    ),
    [menuButton, popModal, userInfo, userProfileThreadInfo],
  );

  return userProfileModal;
}

export default UserProfileModal;
