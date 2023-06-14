// @flow

import * as React from 'react';

import UserAvatar from './user-avatar.react.js';

type Props = {
  +userID: ?string,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const { userID } = props;
  return <UserAvatar userID={userID} size="profile" />;
}

export default EditUserAvatar;
