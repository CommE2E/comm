// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import {
  useSelectAndUploadFromGallery,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import UserAvatar from './user-avatar.react.js';

type Props = {
  +userID: ?string,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const { userID, onPressEmojiAvatarFlow, disabled } = props;

  const selectAndUploadFromGallery = useSelectAndUploadFromGallery();

  const actionSheetConfig = React.useMemo(
    () => [
      { id: 'emoji', onPress: onPressEmojiAvatarFlow },
      { id: 'image', onPress: selectAndUploadFromGallery },
    ],
    [onPressEmojiAvatarFlow, selectAndUploadFromGallery],
  );

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      <UserAvatar userID={userID} size="profile" />
      {!disabled ? <EditAvatarBadge /> : null}
    </TouchableOpacity>
  );
}

export default EditUserAvatar;
