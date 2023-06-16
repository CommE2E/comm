// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './edit-user-avatar.css';
import UserAvatar from './user-avatar.react.js';

type Props = {
  +userID: ?string,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const { userID } = props;
  return (
    <div className={css.editUserAvatarContainer}>
      <UserAvatar userID={userID} size="profile" />
      <div className={css.editAvatarBadge}>
        <SWMansionIcon icon="edit-2" size={20} />
      </div>
    </div>
  );
}

export default EditUserAvatar;
