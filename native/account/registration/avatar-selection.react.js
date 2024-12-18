// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import {
  EditUserAvatarContext,
  type UserAvatarSelection,
} from 'lib/components/edit-user-avatar-provider.react.js';

import AuthButtonContainer from './registration-button-container.react.js';
import AuthContainer from './registration-container.react.js';
import AuthContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  type CoolOrNerdMode,
  type AccountSelection,
  type AvatarData,
  ensAvatarSelection,
  farcasterAvatarSelection,
} from './registration-types.js';
import EditUserAvatar from '../../avatars/edit-user-avatar.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { useCurrentLeafRouteName } from '../../navigation/nav-selectors.js';
import {
  type NavigationRoute,
  RegistrationTermsRouteName,
  CreateSIWEBackupMessageRouteName,
  AvatarSelectionRouteName,
  EmojiAvatarSelectionRouteName,
  RegistrationUserAvatarCameraModalRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type AvatarSelectionParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +accountSelection: AccountSelection,
    +farcasterID: ?string,
    +farcasterAvatarURL: ?string,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'AvatarSelection'>,
  +route: NavigationRoute<'AvatarSelection'>,
};
function AvatarSelection(props: Props): React.Node {
  const { userSelections } = props.route.params;
  const { accountSelection, farcasterAvatarURL, farcasterID } = userSelections;
  const usernameOrETHAddress =
    accountSelection.accountType === 'username'
      ? accountSelection.username
      : accountSelection.address;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { setRegistrationMode } = editUserAvatarContext;

  const prefetchedENSAvatarURI =
    accountSelection.accountType === 'ethereum'
      ? accountSelection.avatarURI
      : undefined;

  let initialAvatarData = cachedSelections.avatarData;
  if (!initialAvatarData && prefetchedENSAvatarURI) {
    initialAvatarData = ensAvatarSelection;
  } else if (!initialAvatarData && farcasterAvatarURL) {
    initialAvatarData = farcasterAvatarSelection;
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
          clientRequest.type !== 'image' &&
            clientRequest.type !== 'encrypted_image' &&
            clientRequest.type !== 'non_keyserver_image',
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

  const currentRouteName = useCurrentLeafRouteName();
  const avatarSelectionHappening =
    currentRouteName === AvatarSelectionRouteName ||
    currentRouteName === EmojiAvatarSelectionRouteName ||
    currentRouteName === RegistrationUserAvatarCameraModalRouteName;
  React.useEffect(() => {
    if (!avatarSelectionHappening) {
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
    avatarSelectionHappening,
    setRegistrationMode,
    setClientAvatarFromSelection,
  ]);

  const { navigate } = props.navigation;
  const onProceed = React.useCallback(async () => {
    const newUserSelections = {
      ...userSelections,
      avatarData,
    };
    if (userSelections.accountSelection.accountType === 'ethereum') {
      navigate<'CreateSIWEBackupMessage'>({
        name: CreateSIWEBackupMessageRouteName,
        params: { userSelections: newUserSelections },
      });
      return;
    }
    navigate<'RegistrationTerms'>({
      name: RegistrationTermsRouteName,
      params: { userSelections: newUserSelections },
    });
  }, [userSelections, avatarData, navigate]);

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
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Pick an avatar</Text>
        <View style={styles.stagedAvatarSection}>
          <View style={styles.editUserAvatar}>
            <EditUserAvatar
              userInfo={userInfoOverride}
              prefetchedENSAvatarURI={prefetchedENSAvatarURI}
              prefetchedFarcasterAvatarURL={farcasterAvatarURL}
              fid={farcasterID}
            />
          </View>
        </View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton onPress={onProceed} label="Next" />
      </AuthButtonContainer>
    </AuthContainer>
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
