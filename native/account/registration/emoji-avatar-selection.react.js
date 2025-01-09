// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import { getDefaultAvatar } from 'lib/shared/avatar-utils.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { useNativeSetUserAvatar } from '../../avatars/avatar-hooks.js';
import EmojiAvatarCreation from '../../avatars/emoji-avatar-creation.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

export type EmojiAvatarSelectionParams = {
  +usernameOrEthAddress: string,
};

type Props = {
  +navigation: AuthNavigationProp<'EmojiAvatarSelection'>,
  +route: NavigationRoute<'EmojiAvatarSelection'>,
};
function EmojiAvatarSelection(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { userAvatarSaveInProgress } = editUserAvatarContext;

  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const { usernameOrEthAddress } = props.route.params;
  const savedEmojiAvatarFunc = React.useCallback(
    () => getDefaultAvatar(usernameOrEthAddress),
    [usernameOrEthAddress],
  );

  const { goBack } = props.navigation;
  const onSuccess = React.useCallback(
    (avatarRequest: UpdateUserAvatarRequest) => {
      goBack();
      return nativeSetUserAvatar(avatarRequest);
    },
    [goBack, nativeSetUserAvatar],
  );

  const styles = useStyles(unboundStyles);
  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Select an emoji</Text>
        <EmojiAvatarCreation
          saveAvatarCall={onSuccess}
          saveAvatarCallLoading={userAvatarSaveInProgress}
          savedEmojiAvatarFunc={savedEmojiAvatarFunc}
        />
      </AuthContentContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
};

export default EmojiAvatarSelection;
