// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useUserProfileThreadInfo } from 'lib/shared/thread-utils.js';
import type { UserInfo } from 'lib/types/user-types.js';

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

  const userInfo: ?UserInfo = useSelector(
    state => state.userStore.userInfos[userID],
  );

  const userProfileThreadInfo = useUserProfileThreadInfo(userInfo);

  const menuButton = React.useMemo(() => {
    if (!userProfileThreadInfo) {
      return null;
    }
    return <UserProfileMenu threadInfo={userProfileThreadInfo.threadInfo} />;
  }, [userProfileThreadInfo]);

  return (
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
  );
}

export default UserProfileModal;
