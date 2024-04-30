// @flow

import * as React from 'react';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { setSyncedMetadataEntryActionType } from 'lib/actions/synced-metadata-actions.js';
import {
  legacyKeyserverRegisterActionTypes,
  legacyKeyserverRegister,
  useIdentityPasswordRegister,
  identityRegisterActionTypes,
  deleteAccountActionTypes,
  useDeleteDiscardedIdentityAccount,
} from 'lib/actions/user-actions.js';
import { useKeyserverAuth } from 'lib/keyserver-conn/keyserver-auth.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { isLoggedInToKeyserver } from 'lib/selectors/user-selectors.js';
import {
  type LegacyLogInStartingPayload,
  logInActionSources,
} from 'lib/types/account-types.js';
import { syncedMetadataNames } from 'lib/types/synced-metadata-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';
import { setURLPrefix } from 'lib/utils/url-utils.js';
import { waitUntilDatabaseDeleted } from 'lib/utils/wait-until-db-deleted.js';

import type {
  RegistrationServerCallInput,
  UsernameAccountSelection,
  AvatarData,
} from './registration-types.js';
import { authoritativeKeyserverID } from '../../authoritative-keyserver.js';
import {
  useNativeSetUserAvatar,
  useUploadSelectedMedia,
} from '../../avatars/avatar-hooks.js';
import { commCoreModule } from '../../native-modules.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nativeLegacyLogInExtraInfoSelector } from '../../selectors/account-selectors.js';
import {
  AppOutOfDateAlertDetails,
  UsernameReservedAlertDetails,
  UsernameTakenAlertDetails,
  UnknownErrorAlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import { setNativeCredentials } from '../native-credentials.js';
import {
  useLegacySIWEServerCall,
  useIdentityWalletRegisterCall,
} from '../siwe-hooks.js';

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

  const legacyLogInExtraInfo = useSelector(nativeLegacyLogInExtraInfoSelector);

  const dispatchActionPromise = useDispatchActionPromise();
  const callLegacyKeyserverRegister = useLegacyAshoatKeyserverCall(
    legacyKeyserverRegister,
  );
  const callIdentityPasswordRegister = useIdentityPasswordRegister();

  const identityRegisterUsernameAccount = React.useCallback(
    async (
      accountSelection: UsernameAccountSelection,
      farcasterID: ?string,
    ) => {
      const identityRegisterPromise = (async () => {
        try {
          return await callIdentityPasswordRegister(
            accountSelection.username,
            accountSelection.password,
            farcasterID,
          );
        } catch (e) {
          if (e.message === 'username reserved') {
            Alert.alert(
              UsernameReservedAlertDetails.title,
              UsernameReservedAlertDetails.message,
            );
          } else if (e.message === 'username already exists') {
            Alert.alert(
              UsernameTakenAlertDetails.title,
              UsernameTakenAlertDetails.message,
            );
          } else if (e.message === 'Unsupported version') {
            Alert.alert(
              AppOutOfDateAlertDetails.title,
              AppOutOfDateAlertDetails.message,
            );
          } else {
            Alert.alert(
              UnknownErrorAlertDetails.title,
              UnknownErrorAlertDetails.message,
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

  const legacyKeyserverRegisterUsernameAccount = React.useCallback(
    async (
      accountSelection: UsernameAccountSelection,
      keyserverURL: string,
    ) => {
      const extraInfo = await legacyLogInExtraInfo();
      const legacyKeyserverRegisterPromise = (async () => {
        try {
          return await callLegacyKeyserverRegister(
            {
              ...extraInfo,
              username: accountSelection.username,
              password: accountSelection.password,
            },
            {
              urlPrefixOverride: keyserverURL,
            },
          );
        } catch (e) {
          if (e.message === 'username_reserved') {
            Alert.alert(
              UsernameReservedAlertDetails.title,
              UsernameReservedAlertDetails.message,
            );
          } else if (e.message === 'username_taken') {
            Alert.alert(
              UsernameTakenAlertDetails.title,
              UsernameTakenAlertDetails.message,
            );
          } else if (e.message === 'client_version_unsupported') {
            Alert.alert(
              AppOutOfDateAlertDetails.title,
              AppOutOfDateAlertDetails.message,
            );
          } else {
            Alert.alert(
              UnknownErrorAlertDetails.title,
              UnknownErrorAlertDetails.message,
            );
          }
          throw e;
        }
      })();
      void dispatchActionPromise(
        legacyKeyserverRegisterActionTypes,
        legacyKeyserverRegisterPromise,
        undefined,
        ({
          calendarQuery: extraInfo.calendarQuery,
        }: LegacyLogInStartingPayload),
      );
      await legacyKeyserverRegisterPromise;
    },
    [legacyLogInExtraInfo, callLegacyKeyserverRegister, dispatchActionPromise],
  );

  const legacySiweServerCall = useLegacySIWEServerCall();
  const identityWalletRegisterCall = useIdentityWalletRegisterCall();
  const dispatch = useDispatch();
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
              keyserverURL,
              farcasterID,
              siweBackupSecrets,
              clearCachedSelections,
            } = input;
            if (
              accountSelection.accountType === 'username' &&
              !usingCommServicesAccessToken
            ) {
              await legacyKeyserverRegisterUsernameAccount(
                accountSelection,
                keyserverURL,
              );
            } else if (accountSelection.accountType === 'username') {
              await identityRegisterUsernameAccount(
                accountSelection,
                farcasterID,
              );
            } else if (!usingCommServicesAccessToken) {
              try {
                await legacySiweServerCall(accountSelection, {
                  urlPrefixOverride: keyserverURL,
                });
              } catch (e) {
                Alert.alert(
                  UnknownErrorAlertDetails.title,
                  UnknownErrorAlertDetails.message,
                );
                throw e;
              }
            } else {
              try {
                await identityWalletRegisterCall({
                  address: accountSelection.address,
                  message: accountSelection.message,
                  signature: accountSelection.signature,
                  fid: farcasterID,
                });
              } catch (e) {
                Alert.alert(
                  UnknownErrorAlertDetails.title,
                  UnknownErrorAlertDetails.message,
                );
                throw e;
              }
            }
            dispatch({
              type: setURLPrefix,
              payload: keyserverURL,
            });
            if (farcasterID) {
              dispatch({
                type: setSyncedMetadataEntryActionType,
                payload: {
                  name: syncedMetadataNames.CURRENT_USER_FID,
                  data: farcasterID,
                },
              });
            }
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
      currentStep,
      legacyKeyserverRegisterUsernameAccount,
      identityRegisterUsernameAccount,
      legacySiweServerCall,
      dispatch,
      identityWalletRegisterCall,
    ],
  );

  // STEP 2: REGISTERING ON AUTHORITATIVE KEYSERVER

  const keyserverAuth = useKeyserverAuth(authoritativeKeyserverID);

  const isRegisteredOnIdentity = useSelector(
    state =>
      !!state.commServicesAccessToken &&
      !!state.currentUserInfo &&
      !state.currentUserInfo.anonymous,
  );

  // We call deleteDiscardedIdentityAccount in order to reset state if identity
  // registration succeeds but authoritative keyserver auth fails
  const deleteDiscardedIdentityAccount = useDeleteDiscardedIdentityAccount();

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
        const discardIdentityAccountPromise = (async () => {
          try {
            return await deleteDiscardedIdentityAccount();
          } catch (deleteException) {
            Alert.alert(
              'Account created but login failed',
              'We were able to create your account, but were unable to log ' +
                'you in. Try going back to the login screen and logging in ' +
                'with your new credentials.',
            );
            throw deleteException;
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
  ]);

  // STEP 3: SETTING AVATAR

  const uploadSelectedMedia = useUploadSelectedMedia();
  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const isLoggedInToAuthoritativeKeyserver = useSelector(
    isLoggedInToKeyserver(authoritativeKeyserverID),
  );

  const avatarBeingSetRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !isLoggedInToAuthoritativeKeyserver ||
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
          updateUserAvatarRequest = await uploadSelectedMedia(mediaSelection);
          if (!updateUserAvatarRequest) {
            return;
          }
        }
        await nativeSetUserAvatar(updateUserAvatarRequest);
      } finally {
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
    isLoggedInToAuthoritativeKeyserver,
    uploadSelectedMedia,
    nativeSetUserAvatar,
    dispatch,
  ]);

  return returnedFunc;
}

export { useRegistrationServerCall };
