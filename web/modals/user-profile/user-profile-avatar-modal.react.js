// @flow

import * as React from 'react';

import UserAvatar from '../../avatars/user-avatar.react.js';
import FullScreenViewModal from '../full-screen-view-modal.react.js';

type Props = {
  +userID: ?string,
};

function UserProfileAvatarModal(props: Props): React.Node {
  const { userID } = props;

  return (
    <FullScreenViewModal>
      <UserAvatar size="XXL" userID={userID} />
    </FullScreenViewModal>
  );
}

export default UserProfileAvatarModal;
