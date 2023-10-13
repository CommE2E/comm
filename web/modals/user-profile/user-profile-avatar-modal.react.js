// @flow

import * as React from 'react';

import UserAvatar from '../../avatars/user-avatar.react.js';
import FullScreenViewModal from '../full-screen-view-modal.react.js';

type Props = {
  +userID: ?string,
};

function UserProfileAvatarModal(props: Props): React.Node {
  const { userID } = props;

  const userProfileAvatarModal = React.useMemo(
    () => (
      <FullScreenViewModal>
        <UserAvatar size="XXL" userID={userID} />
      </FullScreenViewModal>
    ),
    [userID],
  );

  return userProfileAvatarModal;
}

export default UserProfileAvatarModal;
