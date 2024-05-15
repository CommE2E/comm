// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';
import { useLinkFID } from 'lib/utils/farcaster-utils.js';

import {
  getFarcasterAccountAlreadyLinkedAlertDetails,
  unknownErrorAlertDetails,
} from './alert-messages.js';

function useTryLinkFID(): (newFID: string) => Promise<void> {
  const linkFID = useLinkFID();

  return React.useCallback(
    async (newFID: string) => {
      try {
        await linkFID(newFID);
      } catch (e) {
        if (
          getMessageForException(e) ===
          'farcaster ID already associated with different user'
        ) {
          const { title, message } =
            getFarcasterAccountAlreadyLinkedAlertDetails();
          Alert.alert(title, message);
        } else {
          Alert.alert(
            unknownErrorAlertDetails.title,
            unknownErrorAlertDetails.message,
          );
        }
      }
    },
    [linkFID],
  );
}

export { useTryLinkFID };
