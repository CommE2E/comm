// @flow

import { CommonActions } from '@react-navigation/native';
import * as React from 'react';

import { type SIWEResult } from 'lib/types/siwe-types.js';

import { SignSIWEBackupMessageForRestore } from '../account/registration/siwe-backup-message-creation.react.js';
import { type RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  RestoreBackupScreenRouteName,
} from '../navigation/route-names.js';

export type RestoreSIWEBackupParams = {
  +siweNonce: string,
  +siweStatement: string,
  +siweIssuedAt: string,
  +userIdentifier: string,
  +signature: string,
  +message: string,
};

type Props = {
  +navigation: RootNavigationProp<'RestoreSIWEBackup'>,
  +route: NavigationRoute<'RestoreSIWEBackup'>,
};

function RestoreSIWEBackup(props: Props): React.Node {
  const { goBack } = props.navigation;
  const { route } = props;
  const {
    params: {
      siweStatement,
      siweIssuedAt,
      siweNonce,
      userIdentifier,
      signature,
      message,
    },
  } = route;

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      props.navigation.navigate(RestoreBackupScreenRouteName, {
        primaryRestoreInfo: {
          userIdentifier,
          credentials: {
            type: 'siwe',
            socialProof: {
              message,
              signature,
            },
            backup: {
              message: result.message,
              signature: result.signature,
            },
          },
        },
        returnNavAction: CommonActions.navigate({ key: route.key }),
      });
    },
    [message, props.navigation, route.key, signature, userIdentifier],
  );

  return (
    <SignSIWEBackupMessageForRestore
      siweNonce={siweNonce}
      siweStatement={siweStatement}
      siweIssuedAt={siweIssuedAt}
      onSkip={goBack}
      onSuccessfulWalletSignature={onSuccessfulWalletSignature}
    />
  );
}

export default RestoreSIWEBackup;
