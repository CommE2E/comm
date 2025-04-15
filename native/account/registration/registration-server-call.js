// @flow

import * as React from 'react';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { setSyncedMetadataEntryActionType } from 'lib/actions/synced-metadata-actions.js';
import {
  useIdentityPasswordRegister,
  identityRegisterActionTypes,
  deleteAccountActionTypes,
  useDeleteDiscardedIdentityAccount,
} from 'lib/actions/user-actions.js';
import { useIsLoggedInToAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { useKeyserverAuthWithRetry } from 'lib/keyserver-conn/keyserver-auth.js';
import { usePreRequestUserState } from 'lib/selectors/account-selectors.js';
import {
  logInActionSources,
  type LogOutResult,
} from 'lib/types/account-types.js';
import { syncedMetadataNames } from 'lib/types/synced-metadata-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useSetLocalFID } from 'lib/utils/farcaster-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { setURLPrefix } from 'lib/utils/url-utils.js';
import { waitUntilDatabaseDeleted } from 'lib/utils/wait-until-db-deleted.js';

import type {
  RegistrationServerCallInput,
  UsernameAccountSelection,
  EthereumAccountSelection,
  AvatarData,
} from './registration-types.js';
import { authoritativeKeyserverID } from '../../authoritative-keyserver.js';
import {
  useNativeSetUserAvatar,
  useUploadSelectedMedia,
} from '../../avatars/avatar-hooks.js';
import { commCoreModule } from '../../native-modules.js';
import { persistConfig } from '../../redux/persist.js';
import { useSelector } from '../../redux/redux-utils.js';
import {
  appOutOfDateAlertDetails,
  usernameReservedAlertDetails,
  usernameTakenAlertDetails,
  unknownErrorAlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import { setNativeCredentials } from '../native-credentials.js';
import { useIdentityWalletRegisterCall } from '../siwe-hooks.js';

// We can't just do everything in one async callback, since the server calls
// would get bound to Redux state from before the registration. The registration
// flow has multiple steps where critical Redux state is changed, where
// subsequent steps depend on accessing the updated Redux state.

// To address this, we break the registration process up into multiple steps.
// When each step completes we update the currentStep state, and we have Redux
// selectors that trigger useEffects for subsequent steps when relevant data
// starts to appear in Redux.

type CurrentStep =
  | { +step: 'inactive' }
  | {
      +step: 'identity_registration_dispatched',
      +clearCachedSelections: () => void,
      +onAlertAcknowledged: ?() => mixed,
      +avatarData: ?AvatarData,
      +credentialsToSave: ?{ +username: string, +password: string },
      +resolve: () => void,
      +reject: Error => void,
    }
  | {
      +step: 'authoritative_keyserver_registration_dispatched',
      +clearCachedSelections: () => void,
      +avatarData: ?AvatarData,
      +credentialsToSave: ?{ +username: string, +password: string },
      +resolve: () => void,
      +reject: Error => void,
    };

const inactiveStep = { step: 'inactive' };

function useRegistrationServerCall(): RegistrationServerCallInput => Promise<void> {
  const [currentStep, setCurrentStep] =
    React.useState<CurrentStep>(inactiveStep);

  // STEP 1: ACCOUNT REGISTRATION

  const dispatchActionPromise = useDispatchActionPromise();
  const callIdentityPasswordRegister = useIdentityPasswordRegister();

  const identityRegisterUsernameAccount = React.useCallback(
    async (
      accountSelection: UsernameAccountSelection,
      farcasterID: ?string,
      onAlertAcknowledged: ?() => mixed,
    ) => {
      const identityRegisterPromise = (async () => {
        try {
          return await callIdentityPasswordRegister(
            accountSelection.username,
            accountSelection.password,
            farcasterID,
          );
        } catch (e) {
          const messageForException = getMessageForException(e);
          if (messageForException === 'username_reserved') {
            Alert.alert(
              usernameReservedAlertDetails.title,
              usernameReservedAlertDetails.message,
              [{ text: 'OK', onPress: onAlertAcknowledged }],
              { cancelable: !onAlertAcknowledged },
            );
          } else if (messageForException === 'username_already_exists') {
            Alert.alert(
              usernameTakenAlertDetails.title,
              usernameTakenAlertDetails.message,
              [{ text: 'OK', onPress: onAlertAcknowledged }],
              { cancelable: !onAlertAcknowledged },
            );
          } else if (messageForException === 'unsupported_version') {
            Alert.alert(
              appOutOfDateAlertDetails.title,
              appOutOfDateAlertDetails.message,
              [{ text: 'OK', onPress: onAlertAcknowledged }],
              { cancelable: !onAlertAcknowledged },
            );
          } else {
            Alert.alert(
              unknownErrorAlertDetails.title,
              unknownErrorAlertDetails.message,
              [{ text: 'OK', onPress: onAlertAcknowledged }],
              { cancelable: !onAlertAcknowledged },
            );
          }
          throw e;
        }
      })();
      void dispatchActionPromise(
        identityRegisterActionTypes,
        identityRegisterPromise,
      );
      await identityRegisterPromise;
    },
    [callIdentityPasswordRegister, dispatchActionPromise],
  );

  const identityWalletRegisterCall = useIdentityWalletRegisterCall();
  const identityRegisterEthereumAccount = React.useCallback(
    async (
      accountSelection: EthereumAccountSelection,
      farcasterID: ?string,
      onNonceExpired: () => mixed,
      onAlertAcknowledged: ?() => mixed,
    ) => {
      try {
        await identityWalletRegisterCall({
          address: accountSelection.address,
          message: accountSelection.message,
          signature: accountSelection.signature,
          fid: farcasterID,
        });
      } catch (e) {
        const messageForException = getMessageForException(e);
        if (messageForException === 'nonce_expired') {
          onNonceExpired();
        } else if (messageForException === 'unsupported_version') {
          Alert.alert(
            appOutOfDateAlertDetails.title,
            appOutOfDateAlertDetails.message,
            [{ text: 'OK', onPress: onAlertAcknowledged }],
            { cancelable: !onAlertAcknowledged },
          );
        } else {
          Alert.alert(
            unknownErrorAlertDetails.title,
            unknownErrorAlertDetails.message,
            [{ text: 'OK', onPress: onAlertAcknowledged }],
            { cancelable: !onAlertAcknowledged },
          );
        }
        throw e;
      }
    },
    [identityWalletRegisterCall],
  );

  const dispatch = useDispatch();
  const setLocalFID = useSetLocalFID();
  const returnedFunc = React.useCallback(
    (input: RegistrationServerCallInput) =>
      new Promise<void>(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          try {
            if (currentStep.step !== 'inactive') {
              return;
            }
            const {
              accountSelection,
              avatarData,
              keyserverURL: passedKeyserverURL,
              farcasterID,
              siweBackupSecrets,
              clearCachedSelections,
              onNonceExpired,
              onAlertAcknowledged,
            } = input;
            if (accountSelection.accountType === 'username') {
              await identityRegisterUsernameAccount(
                accountSelection,
                farcasterID,
                onAlertAcknowledged,
              );
            } else {
              await identityRegisterEthereumAccount(
                accountSelection,
                farcasterID,
                onNonceExpired,
                onAlertAcknowledged,
              );
            }
            if (passedKeyserverURL) {
              dispatch({
                type: setURLPrefix,
                payload: passedKeyserverURL,
              });
            }
            setLocalFID(farcasterID);
            if (siweBackupSecrets) {
              await commCoreModule.setSIWEBackupSecrets(siweBackupSecrets);
            }
            const credentialsToSave =
              accountSelection.accountType === 'username'
                ? {
                    username: accountSelection.username,
                    password: accountSelection.password,
                  }
                : null;
            setCurrentStep({
              step: 'identity_registration_dispatched',
              avatarData,
              clearCachedSelections,
              onAlertAcknowledged,
              credentialsToSave,
              resolve,
              reject,
            });
          } catch (e) {
            reject(e);
          }
        },
      ),
    [
      currentStep.step,
      dispatch,
      identityRegisterEthereumAccount,
      identityRegisterUsernameAccount,
      setLocalFID,
    ],
  );

  // STEP 2: REGISTERING ON AUTHORITATIVE KEYSERVER

  const keyserverAuth = useKeyserverAuthWithRetry(authoritativeKeyserverID);

  const isRegisteredOnIdentity = useSelector(
    state =>
      !!state.commServicesAccessToken &&
      !!state.currentUserInfo &&
      !state.currentUserInfo.anonymous,
  );

  // We call deleteDiscardedIdentityAccount in order to reset state if identity
  // registration succeeds but authoritative keyserver auth fails
  const deleteDiscardedIdentityAccount = useDeleteDiscardedIdentityAccount();
  const preRequestUserState = usePreRequestUserState();
  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  const registeringOnAuthoritativeKeyserverRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !isRegisteredOnIdentity ||
      currentStep.step !== 'identity_registration_dispatched' ||
      registeringOnAuthoritativeKeyserverRef.current
    ) {
      return;
    }
    registeringOnAuthoritativeKeyserverRef.current = true;
    const {
      avatarData,
      clearCachedSelections,
      onAlertAcknowledged,
      credentialsToSave,
      resolve,
      reject,
    } = currentStep;
    void (async () => {
      try {
        await keyserverAuth({
          authActionSource: process.env.BROWSER
            ? logInActionSources.keyserverAuthFromWeb
            : logInActionSources.keyserverAuthFromNative,
          setInProgress: () => {},
          hasBeenCancelled: () => false,
          doNotRegister: false,
        });
        setCurrentStep({
          step: 'authoritative_keyserver_registration_dispatched',
          avatarData,
          clearCachedSelections,
          credentialsToSave,
          resolve,
          reject,
        });
      } catch (keyserverAuthException) {
        const messageForException = getMessageForException(
          keyserverAuthException,
        );
        const discardIdentityAccountPromise: Promise<LogOutResult> =
          (async () => {
            try {
              const deletionResult = await deleteDiscardedIdentityAccount(
                credentialsToSave?.password,
              );
              if (messageForException === 'client_version_unsupported') {
                Alert.alert(
                  appOutOfDateAlertDetails.title,
                  appOutOfDateAlertDetails.message,
                  [{ text: 'OK', onPress: onAlertAcknowledged }],
                  { cancelable: !onAlertAcknowledged },
                );
              } else {
                Alert.alert(
                  unknownErrorAlertDetails.title,
                  unknownErrorAlertDetails.message,
                  [{ text: 'OK', onPress: onAlertAcknowledged }],
                  { cancelable: !onAlertAcknowledged },
                );
              }
              return deletionResult;
            } catch (deleteException) {
              // We swallow the exception here because
              // discardIdentityAccountPromise is used in a scenario where the
              // user is visibly logged-out, and it's only used to reset state
              // (eg. Redux, SQLite) to a logged-out state. The state reset
              // only occurs when a success action is dispatched, so by
              // swallowing exceptions we ensure that we always dispatch a
              // success.
              Alert.alert(
                'Account created but login failed',
                'We were able to create your account, but were unable to log ' +
                  'you in. Try going back to the login screen and logging in ' +
                  'with your new credentials.',
                [{ text: 'OK', onPress: onAlertAcknowledged }],
                { cancelable: !onAlertAcknowledged },
              );
              return {
                currentUserInfo: null,
                preRequestUserState: {
                  ...preRequestUserState,
                  commServicesAccessToken,
                },
              };
            }
          })();
        void dispatchActionPromise(
          deleteAccountActionTypes,
          discardIdentityAccountPromise,
        );
        await waitUntilDatabaseDeleted();
        reject(keyserverAuthException);
        setCurrentStep(inactiveStep);
      } finally {
        registeringOnAuthoritativeKeyserverRef.current = false;
      }
    })();
  }, [
    currentStep,
    isRegisteredOnIdentity,
    keyserverAuth,
    dispatchActionPromise,
    deleteDiscardedIdentityAccount,
    preRequestUserState,
    commServicesAccessToken,
  ]);

  // STEP 3: SETTING AVATAR

  const uploadSelectedMedia = useUploadSelectedMedia();
  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const isLoggedInToAuthKeyserver = useIsLoggedInToAuthoritativeKeyserver();

  const avatarBeingSetRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !isLoggedInToAuthKeyserver ||
      currentStep.step !== 'authoritative_keyserver_registration_dispatched' ||
      avatarBeingSetRef.current
    ) {
      return;
    }
    avatarBeingSetRef.current = true;
    const { avatarData, resolve, clearCachedSelections, credentialsToSave } =
      currentStep;
    void (async () => {
      try {
        if (!avatarData) {
          return;
        }
        let updateUserAvatarRequest;
        if (!avatarData.needsUpload) {
          ({ updateUserAvatarRequest } = avatarData);
        } else {
          const { mediaSelection } = avatarData;
          updateUserAvatarRequest = await uploadSelectedMedia(
            mediaSelection,
            'keyserver',
          );
          if (!updateUserAvatarRequest) {
            return;
          }
        }
        await nativeSetUserAvatar(updateUserAvatarRequest);
      } finally {
        dispatch({
          type: setSyncedMetadataEntryActionType,
          payload: {
            name: syncedMetadataNames.DB_VERSION,
            data: `${persistConfig.version}`,
          },
        });
        dispatch({
          type: setDataLoadedActionType,
          payload: {
            dataLoaded: true,
          },
        });
        clearCachedSelections();
        if (credentialsToSave) {
          void setNativeCredentials(credentialsToSave);
        }
        setCurrentStep(inactiveStep);
        avatarBeingSetRef.current = false;
        resolve();
      }
    })();
  }, [
    currentStep,
    isLoggedInToAuthKeyserver,
    uploadSelectedMedia,
    nativeSetUserAvatar,
    dispatch,
  ]);

  return returnedFunc;
}

export { useRegistrationServerCall };
