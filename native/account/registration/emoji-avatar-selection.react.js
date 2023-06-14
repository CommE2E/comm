// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import { getDefaultAvatar } from 'lib/shared/avatar-utils.js';

import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import EmojiAvatarCreation from '../../avatars/emoji-avatar-creation.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type EmojiAvatarSelectionParams = {
  +usernameOrEthAddress: string,
};

type Props = {
  +navigation: RegistrationNavigationProp<'EmojiAvatarSelection'>,
  +route: NavigationRoute<'EmojiAvatarSelection'>,
};
function EmojiAvatarSelection(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');

  const { setUserAvatar, userAvatarSaveInProgress } = editUserAvatarContext;

  const { usernameOrEthAddress } = props.route.params;
  const savedEmojiAvatarFunc = React.useCallback(
    () => getDefaultAvatar(usernameOrEthAddress),
    [usernameOrEthAddress],
  );

  const { goBack } = props.navigation;
  const onSuccess = React.useCallback(
    avatarRequest => {
      goBack();
      return setUserAvatar(avatarRequest);
    },
    [goBack, setUserAvatar],
  );

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Select an emoji</Text>
        <EmojiAvatarCreation
          saveAvatarCall={onSuccess}
          saveAvatarCallLoading={userAvatarSaveInProgress}
          savedEmojiAvatarFunc={savedEmojiAvatarFunc}
        />
      </RegistrationContentContainer>
    </RegistrationContainer>
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
