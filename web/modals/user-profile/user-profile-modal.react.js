// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { UserInfo } from 'lib/types/user-types.js';

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

  return (
    <Modal size="large" onClose={popModal} name="">
      <UserProfile userInfo={userInfo} />
    </Modal>
  );
}

export default UserProfileModal;
