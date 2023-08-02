// @flow

import invariant from 'invariant';
import * as React from 'react';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { getETHAddressForUserInfo } from 'lib/shared/account-utils.js';

import css from './edit-user-avatar-menu.css';
import EmojiAvatarSelectionModal from './emoji-avatar-selection-modal.react.js';
import CommIcon from '../CommIcon.react.js';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';
import { allowedMimeTypeString } from '../media/file-utils.js';
import { useSelector } from '../redux/redux-utils.js';

const editIcon = (
  <div className={css.editAvatarBadge}>
    <SWMansionIcon icon="edit-2" size={20} />
  </div>
);

function EditUserAvatarMenu(): React.Node {
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const ethAddress: ?string = React.useMemo(
    () => getETHAddressForUserInfo(currentUserInfo),
    [currentUserInfo],
  );
  const ensAvatarURI: ?string = useENSAvatar(ethAddress);

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { baseSetUserAvatar } = editUserAvatarContext;

  const removeUserAvatar = React.useCallback(
    () => baseSetUserAvatar({ type: 'remove' }),
    [baseSetUserAvatar],
  );

  const { pushModal } = useModalContext();

  const openEmojiSelectionModal = React.useCallback(
    () => pushModal(<EmojiAvatarSelectionModal />),
    [pushModal],
  );

  const emojiMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="emoji"
        text="Select emoji"
        icon="emote-smile"
        onClick={openEmojiSelectionModal}
      />
    ),
    [openEmojiSelectionModal],
  );

  const imageInputRef = React.useRef();
  const onImageMenuItemClicked = React.useCallback(
    () => imageInputRef.current?.click(),
    [],
  );

  const onImageSelected = React.useCallback(
    event => console.log(event.target.files),
    [],
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

  const setENSUserAvatar = React.useCallback(
    () => baseSetUserAvatar({ type: 'ens' }),
    [baseSetUserAvatar],
  );

  const ethereumIcon = React.useMemo(
    () => <CommIcon icon="ethereum-outline" size={22} />,
    [],
  );

  const ensMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="ens"
        text="Use ENS avatar"
        onClick={setENSUserAvatar}
        iconComponent={ethereumIcon}
      />
    ),
    [ethereumIcon, setENSUserAvatar],
  );

  const removeMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="remove"
        text="Reset to default"
        icon="trash-2"
        onClick={removeUserAvatar}
      />
    ),
    [removeUserAvatar],
  );

  const menuItems = React.useMemo(() => {
    const items = [emojiMenuItem, imageMenuItem];
    if (ensAvatarURI) {
      items.push(ensMenuItem);
    }
    if (currentUserInfo?.avatar) {
      items.push(removeMenuItem);
    }
    return items;
  }, [
    currentUserInfo?.avatar,
    emojiMenuItem,
    ensAvatarURI,
    ensMenuItem,
    imageMenuItem,
    removeMenuItem,
  ]);

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

export default EditUserAvatarMenu;
