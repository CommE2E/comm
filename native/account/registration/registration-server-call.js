// @flow

import * as React from 'react';
import { Alert, Platform } from 'react-native';
import { useDispatch } from 'react-redux';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import { registerActionTypes, register } from 'lib/actions/user-actions.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
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
import { NavContext } from '../../navigation/navigation-context.js';
import { useSelector } from '../../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../../selectors/account-selectors.js';
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

  const navContext = React.useContext(NavContext);
  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callRegister = useServerCall(register);

  const registerUsernameAccount = React.useCallback(
    async (
      accountSelection: UsernameAccountSelection,
      keyserverURL: string,
    ) => {
      const extraInfo = await logInExtraInfo();
      const registerPromise = (async () => {
        try {
          const result = await callRegister(
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
              'Username reserved',
              'This username is currently reserved. Please contact support@' +
                'comm.app if you would like to claim this account.',
            );
          } else if (e.message === 'username_taken') {
            Alert.alert(
              'Username taken',
              'An account with that username already exists',
            );
          } else if (e.message === 'client_version_unsupported') {
            const app = Platform.select({
              ios: 'App Store',
              android: 'Play Store',
            });
            Alert.alert(
              'App out of date',
              'Your app version is pretty old, and the server doesn’t know how ' +
                `to speak to it anymore. Please use the ${app} app to update!`,
            );
          } else {
            Alert.alert('Unknown error', 'Uhh... try again?');
          }
          throw e;
        }
      })();
      dispatchActionPromise(
        registerActionTypes,
        registerPromise,
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
      await registerPromise;
    },
    [logInExtraInfo, callRegister, dispatchActionPromise],
  );

  const siweServerCallParams = React.useMemo(() => {
    const onServerCallFailure = () => {
      Alert.alert('Unknown error', 'Uhh... try again?');
    };
    return { onFailure: onServerCallFailure };
  }, []);
  const siweServerCall = useSIWEServerCall(siweServerCallParams);

  const dispatch = useDispatch();
  const returnedFunc = React.useCallback(
    (input: RegistrationServerCallInput) =>
      new Promise(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          try {
            if (currentStep.step !== 'inactive') {
              return;
            }
            const { accountSelection, avatarData, keyserverURL } = input;
            if (accountSelection.accountType === 'username') {
              await registerUsernameAccount(accountSelection, keyserverURL);
            } else {
              await siweServerCall(accountSelection, {
                urlPrefixOverride: keyserverURL,
              });
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
    [currentStep, registerUsernameAccount, siweServerCall, dispatch],
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
    (async () => {
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
