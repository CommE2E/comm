// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { SIWEResult } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import EditUserAvatar from '../../avatars/edit-user-avatar.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type EthereumAccountSelections = {
  +accountType: 'ethereum',
  ...SIWEResult,
};

type UsernameAccountSelections = {
  +accountType: 'username',
  +username: string,
  +password: string,
};

export type AvatarSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
    +accountSelections: EthereumAccountSelections | UsernameAccountSelections,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'AvatarSelection'>,
  +route: NavigationRoute<'AvatarSelection'>,
};
function AvatarSelection(props: Props): React.Node {
  const { userSelections } = props.route.params;
  const { accountSelections } = userSelections;
  const username =
    accountSelections.accountType === 'username'
      ? accountSelections.username
      : accountSelections.address;

  const [avatarData] = React.useState();

  const onProceed = React.useCallback(() => {}, []);

  const clientAvatar = avatarData?.clientAvatar;
  const userInfoOverride = React.useMemo(
    () => ({
      username,
      avatar: clientAvatar,
    }),
    [username, clientAvatar],
  );

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Pick an avatar</Text>
        <View style={styles.stagedAvatarSection}>
          <View style={styles.editUserAvatar}>
            <EditUserAvatar userInfo={userInfoOverride} disabled={false} />
          </View>
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Next"
          variant="disabled"
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  stagedAvatarSection: {
    marginTop: 16,
    backgroundColor: 'panelForeground',
    paddingVertical: 24,
    alignItems: 'center',
  },
  editUserAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default AvatarSelection;
