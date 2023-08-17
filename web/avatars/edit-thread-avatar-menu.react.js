// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import { useUploadAvatarMedia } from './avatar-hooks.react.js';
import css from './edit-avatar-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import { allowedMimeTypeString } from '../media/file-utils.js';

const editIcon = (
  <div className={css.editAvatarBadge}>
    <SWMansionIcon icon="edit-2" size={20} />
  </div>
);

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
};
function EditThreadAvatarMenu(props: Props): React.Node {
  const { threadInfo } = props;

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');

  const { baseSetThreadAvatar } = editThreadAvatarContext;

  const removeThreadAvatar = React.useCallback(
    () => baseSetThreadAvatar(threadInfo.id, { type: 'remove' }),
    [baseSetThreadAvatar, threadInfo.id],
  );

  const removeMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="remove"
        text="Reset to default"
        icon="trash-2"
        onClick={removeThreadAvatar}
      />
    ),
    [removeThreadAvatar],
  );

  const imageInputRef = React.useRef();
  const onImageMenuItemClicked = React.useCallback(
    () => imageInputRef.current?.click(),
    [],
  );

  const uploadAvatarMedia = useUploadAvatarMedia();
  const onImageSelected = React.useCallback(
    async event => {
      const uploadResult = await uploadAvatarMedia(event.target.files[0]);
      baseSetThreadAvatar(threadInfo.id, {
        type: 'image',
        uploadID: uploadResult.id,
      });
    },
    [baseSetThreadAvatar, threadInfo.id, uploadAvatarMedia],
  );

  const imageMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="image"
        text="Select image"
        icon="image-1"
        onClick={onImageMenuItemClicked}
      />
    ),
    [onImageMenuItemClicked],
  );

  const menuItems = React.useMemo(() => {
    const items = [imageMenuItem];
    if (threadInfo.avatar) {
      items.push(removeMenuItem);
    }
    return items;
  }, [imageMenuItem, removeMenuItem, threadInfo.avatar]);

  return (
    <div>
      <input
        type="file"
        onChange={onImageSelected}
        ref={imageInputRef}
        accept={allowedMimeTypeString}
      />
      <Menu icon={editIcon}>{menuItems}</Menu>
    </div>
  );
}

export default EditThreadAvatarMenu;
