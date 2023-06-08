// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  type CoolOrNerdMode,
  type AccountSelection,
  type AvatarData,
  ensAvatarSelection,
} from './registration-types.js';
import {
  EditUserAvatarContext,
  type UserAvatarSelection,
} from '../../avatars/edit-user-avatar-provider.react.js';
import EditUserAvatar from '../../avatars/edit-user-avatar.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type AvatarSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
    +accountSelection: AccountSelection,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'AvatarSelection'>,
  +route: NavigationRoute<'AvatarSelection'>,
};
function AvatarSelection(props: Props): React.Node {
  const { userSelections } = props.route.params;
  const { accountSelection } = userSelections;
  const usernameOrETHAddress =
    accountSelection.accountType === 'username'
      ? accountSelection.username
      : accountSelection.address;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections, register } =
    registrationContext;

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { setRegistrationMode } = editUserAvatarContext;

  const prefetchedAvatarURI =
    accountSelection.accountType === 'ethereum'
      ? accountSelection.avatarURI
      : undefined;

  let initialAvatarData = cachedSelections.avatarData;
  if (!initialAvatarData && prefetchedAvatarURI) {
    initialAvatarData = ensAvatarSelection;
  }

  const [avatarData, setAvatarData] =
    React.useState<?AvatarData>(initialAvatarData);

  const setClientAvatarFromSelection = React.useCallback(
    (selection: UserAvatarSelection) => {
      if (selection.needsUpload) {
        const newAvatarData = {
          ...selection,
          clientAvatar: {
            type: 'image',
            uri: selection.mediaSelection.uri,
          },
        };
        setAvatarData(newAvatarData);
        setCachedSelections(oldUserSelections => ({
          ...oldUserSelections,
          avatarData: newAvatarData,
        }));
      } else if (selection.updateUserAvatarRequest.type !== 'remove') {
        const clientRequest = selection.updateUserAvatarRequest;
        invariant(
          clientRequest.type !== 'image',
          'image avatars need to be uploaded',
        );
        const newAvatarData = {
          ...selection,
          clientAvatar: clientRequest,
        };
        setAvatarData(newAvatarData);
        setCachedSelections(oldUserSelections => ({
          ...oldUserSelections,
          avatarData: newAvatarData,
        }));
      } else {
        setAvatarData(undefined);
        setCachedSelections(oldUserSelections => ({
          ...oldUserSelections,
          avatarData: undefined,
        }));
      }
    },
    [setCachedSelections],
  );

  const [registrationInProgress, setRegistrationInProgress] =
    React.useState(false);

  React.useEffect(() => {
    if (registrationInProgress) {
      return undefined;
    }
    setRegistrationMode({
      registrationMode: 'on',
      successCallback: setClientAvatarFromSelection,
    });
    return () => {
      setRegistrationMode({ registrationMode: 'off' });
    };
  }, [
    registrationInProgress,
    setRegistrationMode,
    setClientAvatarFromSelection,
  ]);

  const onProceed = React.useCallback(async () => {
    setRegistrationInProgress(true);
    try {
      await register({
        ...userSelections,
        avatarData,
      });
    } finally {
      setRegistrationInProgress(false);
    }
  }, [register, userSelections, avatarData]);

  const clientAvatar = avatarData?.clientAvatar;
  const userInfoOverride = React.useMemo(
    () => ({
      username: usernameOrETHAddress,
      avatar: clientAvatar,
    }),
    [usernameOrETHAddress, clientAvatar],
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
              showSpinnerDuringServerCall={false}
            />
          </View>
        </View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Submit"
          variant={registrationInProgress ? 'loading' : 'enabled'}
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
