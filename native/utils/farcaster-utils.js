// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import type { SetState } from 'lib/types/hook-types.js';
import { useLinkFID } from 'lib/utils/farcaster-utils.js';

import {
  getFarcasterAccountAlreadyLinkedAlertDetails,
  UnknownErrorAlertDetails,
} from './alert-messages.js';
import type { FarcasterWebViewState } from '../components/farcaster-web-view.react.js';

function useOnSuccessConnectToFarcaster(
  setWebViewState: SetState<FarcasterWebViewState>,
): (newFid: string) => Promise<void> {
  const linkFID = useLinkFID();

  return React.useCallback(
    async (newFID: string) => {
      setWebViewState('closed');

      try {
        await linkFID(newFID);
      } catch (error) {
        if (
          error.message ===
          'farcaster ID already associated with different user'
        ) {
          const { title, message } =
            getFarcasterAccountAlreadyLinkedAlertDetails();

          Alert.alert(title, message);
        } else {
          Alert.alert(
            UnknownErrorAlertDetails.title,
            UnknownErrorAlertDetails.message,
          );
        }
      }
    },
    [linkFID, setWebViewState],
  );
}

export { useOnSuccessConnectToFarcaster };
