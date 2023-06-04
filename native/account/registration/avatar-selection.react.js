// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import type {
  UpdateUserAvatarRequest,
  ClientAvatar,
} from 'lib/types/avatar-types.js';
import type { NativeMediaSelection } from 'lib/types/media-types.js';
import type { SIWEResult } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import {
  EditUserAvatarContext,
  type UserAvatarSelection,
} from '../../avatars/edit-user-avatar-provider.react.js';
import EditUserAvatar from '../../avatars/edit-user-avatar.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type EthereumAccountSelections = {
  +accountType: 'ethereum',
  ...SIWEResult,
  +avatarURI: ?string,
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

type AvatarData =
  | {
      +needsUpload: true,
      +mediaSelection: NativeMediaSelection,
      +clientAvatar: ClientAvatar,
    }
  | {
      +needsUpload: false,
      +updateUserAvatarRequest: UpdateUserAvatarRequest,
      +clientAvatar: ClientAvatar,
    };

const ensDefaultSelection = {
  needsUpload: false,
  updateUserAvatarRequest: { type: 'ens' },
  clientAvatar: { type: 'ens' },
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

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { setRegistrationMode } = editUserAvatarContext;

  const prefetchedAvatarURI =
    accountSelections.accountType === 'ethereum'
      ? accountSelections.avatarURI
      : undefined;

  const [avatarData, setAvatarData] = React.useState<?AvatarData>(
    prefetchedAvatarURI ? ensDefaultSelection : undefined,
  );

  const setClientAvatarFromSelection = React.useCallback(
    (selection: UserAvatarSelection) => {
      if (selection.needsUpload) {
        setAvatarData({
          ...selection,
          clientAvatar: {
            type: 'image',
            uri: selection.mediaSelection.uri,
          },
        });
      } else if (selection.updateUserAvatarRequest.type !== 'remove') {
        const clientRequest = selection.updateUserAvatarRequest;
        invariant(
          clientRequest.type !== 'image',
          'image avatars need to be uploaded',
        );
        setAvatarData({
          ...selection,
          clientAvatar: clientRequest,
        });
      } else {
        setAvatarData(undefined);
      }
    },
    [],
  );

  React.useEffect(() => {
    setRegistrationMode({
      registrationMode: 'on',
      successCallback: setClientAvatarFromSelection,
    });
    return () => {
      setRegistrationMode({ registrationMode: 'off' });
    };
  }, [setRegistrationMode, setClientAvatarFromSelection]);

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
            <EditUserAvatar
              userInfo={userInfoOverride}
              disabled={registrationInProgress}
              prefetchedAvatarURI={prefetchedAvatarURI}
            />
          </View>
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Submit"
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
