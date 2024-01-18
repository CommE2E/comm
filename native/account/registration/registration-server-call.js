// @flow

import * as React from 'react';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import {
  keyserverRegisterActionTypes,
  keyserverRegister,
  useIdentityRegister,
  identityRegisterActionTypes,
} from 'lib/actions/user-actions.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';
import { setURLPrefix } from 'lib/utils/url-utils.js';

import type {
  RegistrationServerCallInput,
  UsernameAccountSelection,
  AvatarData,
} from './registration-types.js';
import {
  useNativeSetUserAvatar,
  useUploadSelectedMedia,
} from '../../avatars/avatar-hooks.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../../selectors/account-selectors.js';
import {
  AppOutOfDateAlertDetails,
  UsernameReservedAlertDetails,
  UsernameTakenAlertDetails,
} from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import { setNativeCredentials } from '../native-credentials.js';
import { useSIWEServerCall } from '../siwe-hooks.js';

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
      +step: 'waiting_for_registration_call',
      +avatarData: ?AvatarData,
      +resolve: () => void,
      +reject: Error => void,
    };

const inactiveStep = { step: 'inactive' };

function useRegistrationServerCall(): RegistrationServerCallInput => Promise<void> {
  const [currentStep, setCurrentStep] =
    React.useState<CurrentStep>(inactiveStep);

  // STEP 1: ACCOUNT REGISTRATION

  const logInExtraInfo = useSelector(nativeLogInExtraInfoSelector);

  const dispatchActionPromise = useDispatchActionPromise();
  const callKeyserverRegister = useLegacyAshoatKeyserverCall(keyserverRegister);
  const callIdentityRegister = useIdentityRegister();

  const identityRegisterUsernameAccount = React.useCallback(
    async (accountSelection: UsernameAccountSelection) => {
      const identityRegisterPromise = (async () => {
        try {
          const result = await callIdentityRegister(
            accountSelection.username,
            accountSelection.password,
          );
          await setNativeCredentials({
            username: accountSelection.username,
            password: accountSelection.password,
          });
          return result;
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
            Alert.alert('Unknown error', 'Uhh... try again?');
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
    [callIdentityRegister, dispatchActionPromise],
  );

  const keyserverRegisterUsernameAccount = React.useCallback(
    async (
      accountSelection: UsernameAccountSelection,
      keyserverURL: string,
    ) => {
      const extraInfo = await logInExtraInfo();
      const keyserverRegisterPromise = (async () => {
        try {
          const result = await callKeyserverRegister(
            {
              ...extraInfo,
              username: accountSelection.username,
              password: accountSelection.password,
            },
            {
              urlPrefixOverride: keyserverURL,
            },
          );
          await setNativeCredentials({
            username: result.currentUserInfo.username,
            password: accountSelection.password,
          });
          return result;
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
            Alert.alert('Unknown error', 'Uhh... try again?');
          }
          throw e;
        }
      })();
      void dispatchActionPromise(
        keyserverRegisterActionTypes,
        keyserverRegisterPromise,
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
      await keyserverRegisterPromise;
    },
    [logInExtraInfo, callKeyserverRegister, dispatchActionPromise],
  );

  const siweServerCall = useSIWEServerCall();
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
            const { accountSelection, avatarData, keyserverURL } = input;
            if (
              accountSelection.accountType === 'username' &&
              !usingCommServicesAccessToken
            ) {
              await keyserverRegisterUsernameAccount(
                accountSelection,
                keyserverURL,
              );
            } else if (accountSelection.accountType === 'username') {
              await identityRegisterUsernameAccount(accountSelection);
            } else {
              try {
                await siweServerCall(accountSelection, {
                  urlPrefixOverride: keyserverURL,
                });
              } catch (e) {
                Alert.alert('Unknown error', 'Uhh... try again?');
                throw e;
              }
            }
            dispatch({
              type: setURLPrefix,
              payload: keyserverURL,
            });
            setCurrentStep({
              step: 'waiting_for_registration_call',
              avatarData,
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
      keyserverRegisterUsernameAccount,
      identityRegisterUsernameAccount,
      siweServerCall,
      dispatch,
    ],
  );

  // STEP 2: SETTING AVATAR

  const uploadSelectedMedia = useUploadSelectedMedia();
  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const hasCurrentUserInfo = useSelector(
    state => !!state.currentUserInfo && !state.currentUserInfo.anonymous,
  );

  const avatarBeingSetRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !hasCurrentUserInfo ||
      currentStep.step !== 'waiting_for_registration_call' ||
      avatarBeingSetRef.current
    ) {
      return;
    }
    avatarBeingSetRef.current = true;
    const { avatarData, resolve } = currentStep;
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
        setCurrentStep(inactiveStep);
        avatarBeingSetRef.current = false;
        resolve();
      }
    })();
  }, [
    currentStep,
    hasCurrentUserInfo,
    uploadSelectedMedia,
    nativeSetUserAvatar,
    dispatch,
  ]);

  return returnedFunc;
}

export { useRegistrationServerCall };
