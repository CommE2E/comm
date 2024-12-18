// @flow

import Icon from '@expo/vector-icons/MaterialIcons.js';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';

import { RegistrationContext } from './registration-context.js';
import { type RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  AccountSelection,
  AvatarData,
} from './registration-types.js';
import PrimaryButton from '../../components/primary-button.react.js';
import {
  type NavigationRoute,
  RegistrationTermsRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import Alert from '../../utils/alert.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';
import { useSIWEPanelState } from '../siwe-hooks.js';
import SIWEPanel from '../siwe-panel.react.js';

const siweBackupSignatureRequestData = {
  messageType: SIWEMessageTypes.MSG_BACKUP,
};

type CreateSIWEBackupMessageBaseProps = {
  +onSuccessfulWalletSignature: (result: SIWEResult) => void,
  +onExistingWalletSignature?: () => void,
  +onSkip?: () => void,
};

const CreateSIWEBackupMessageBase: React.ComponentType<CreateSIWEBackupMessageBaseProps> =
  React.memo<CreateSIWEBackupMessageBaseProps>(
    function CreateSIWEBackupMessageBase(
      props: CreateSIWEBackupMessageBaseProps,
    ): React.Node {
      const styles = useStyles(unboundStyles);
      const { onSuccessfulWalletSignature, onExistingWalletSignature, onSkip } =
        props;

      const {
        panelState,
        onPanelClosed,
        onPanelClosing,
        openPanel,
        siwePanelSetLoading,
      } = useSIWEPanelState();

      let siwePanel;
      if (panelState !== 'closed') {
        siwePanel = (
          <SIWEPanel
            onClosing={onPanelClosing}
            onClosed={onPanelClosed}
            closing={panelState === 'closing'}
            onSuccessfulWalletSignature={onSuccessfulWalletSignature}
            siweSignatureRequestData={siweBackupSignatureRequestData}
            setLoading={siwePanelSetLoading}
          />
        );
      }

      const newSignatureButtonText = onExistingWalletSignature
        ? 'Encrypt with new signature'
        : 'Encrypt with Ethereum signature';
      const defaultNewSignatureButtonVariant = onExistingWalletSignature
        ? 'outline'
        : 'enabled';
      const newSignatureButtonVariant =
        panelState === 'opening' ? 'loading' : defaultNewSignatureButtonVariant;

      let useExistingSignatureButton;
      if (onExistingWalletSignature) {
        useExistingSignatureButton = (
          <PrimaryButton
            onPress={onExistingWalletSignature}
            label="Encrypt with existing signature"
            variant="enabled"
          />
        );
      }

      let onSkipButton;
      if (onSkip) {
        onSkipButton = (
          <PrimaryButton onPress={onSkip} label="Skip" variant="outline" />
        );
      }

      return (
        <>
          <AuthContainer>
            <AuthContentContainer style={styles.scrollViewContentContainer}>
              <Text style={styles.header}>Encrypting your Comm backup</Text>
              <Text style={styles.body}>
                To make sure we can’t see your data, Comm encrypts your backup
                using a signature from your wallet.
              </Text>
              <Text style={styles.body}>
                This signature is private and never leaves your device, unlike
                the prior signature, which is public.
              </Text>
              <Text style={styles.body}>
                This signature ensures that you can always recover your data as
                long as you still control your wallet.
              </Text>
              <View style={styles.siweBackupIconContainer}>
                <Icon name="backup" size={200} style={styles.siweBackupIcon} />
              </View>
            </AuthContentContainer>
            <AuthButtonContainer>
              {useExistingSignatureButton}
              <PrimaryButton
                onPress={openPanel}
                label={newSignatureButtonText}
                variant={newSignatureButtonVariant}
              />
              {onSkipButton}
            </AuthButtonContainer>
          </AuthContainer>
          {siwePanel}
        </>
      );
    },
  );

export type CreateSIWEBackupMessageParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +farcasterID: ?string,
    +accountSelection: AccountSelection,
    +avatarData: ?AvatarData,
    +farcasterAvatarURL: ?string,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'CreateSIWEBackupMessage'>,
  +route: NavigationRoute<'CreateSIWEBackupMessage'>,
};
function CreateSIWEBackupMessage(props: Props): React.Node {
  const { navigate } = props.navigation;
  const { params } = props.route;
  const { userSelections } = params;

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      const selectedEthereumAddress = userSelections.accountSelection.address;
      const { message, signature, address } = result;

      if (address !== selectedEthereumAddress) {
        Alert.alert(
          'Mismatched Ethereum address',
          'You picked a different wallet than the one you use to sign in.',
        );
        return;
      }

      const newUserSelections = {
        ...userSelections,
        siweBackupSecrets: { message, signature },
      };
      setCachedSelections(oldUserSelections => ({
        ...oldUserSelections,
        siweBackupSecrets: { message, signature },
      }));
      navigate<'RegistrationTerms'>({
        name: RegistrationTermsRouteName,
        params: { userSelections: newUserSelections },
      });
    },
    [navigate, setCachedSelections, userSelections],
  );

  const { siweBackupSecrets } = cachedSelections;
  const onExistingWalletSignature = React.useCallback(() => {
    const registrationTermsParams = {
      userSelections: {
        ...userSelections,
        siweBackupSecrets,
      },
    };

    navigate<'RegistrationTerms'>({
      name: RegistrationTermsRouteName,
      params: registrationTermsParams,
    });
  }, [navigate, siweBackupSecrets, userSelections]);

  if (siweBackupSecrets) {
    return (
      <CreateSIWEBackupMessageBase
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        onExistingWalletSignature={onExistingWalletSignature}
      />
    );
  }

  return (
    <CreateSIWEBackupMessageBase
      onSuccessfulWalletSignature={onSuccessfulWalletSignature}
    />
  );
}

type SignSIWEBackupMessageForRestoreBaseProps = {
  +siweNonce: string,
  +siweIssuedAt: string,
  +siweStatement: string,
  +onSuccessfulWalletSignature: (result: SIWEResult) => void,
  +onSkip: () => void,
};

function SignSIWEBackupMessageForRestore(
  props: SignSIWEBackupMessageForRestoreBaseProps,
): React.Node {
  const styles = useStyles(unboundStyles);
  const {
    panelState,
    openPanel,
    onPanelClosed,
    onPanelClosing,
    siwePanelSetLoading,
  } = useSIWEPanelState();

  const {
    siweIssuedAt,
    siweNonce,
    siweStatement,
    onSuccessfulWalletSignature,
    onSkip,
  } = props;
  const siweSignatureRequestData = React.useMemo(
    () => ({
      messageType: SIWEMessageTypes.MSG_BACKUP_RESTORE,
      siweNonce,
      siweStatement,
      siweIssuedAt,
    }),
    [siweStatement, siweIssuedAt, siweNonce],
  );

  let siwePanel;
  if (panelState !== 'closed') {
    siwePanel = (
      <SIWEPanel
        onClosing={onPanelClosing}
        onClosed={onPanelClosed}
        closing={panelState === 'closing'}
        onSuccessfulWalletSignature={onSuccessfulWalletSignature}
        siweSignatureRequestData={siweSignatureRequestData}
        setLoading={siwePanelSetLoading}
      />
    );
  }

  return (
    <>
      <AuthContainer>
        <AuthContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>Decrypting your Comm backup</Text>
          <Text style={styles.body}>
            To make sure we can’t see your data, Comm encrypts your backup using
            a signature from your wallet.
          </Text>
          <View style={styles.siweBackupIconContainer}>
            <Icon name="backup" size={200} style={styles.siweBackupIcon} />
          </View>
        </AuthContentContainer>
        <AuthButtonContainer>
          <PrimaryButton
            onPress={openPanel}
            label="Decrypt with Ethereum signature"
            variant="enabled"
          />
          <PrimaryButton onPress={onSkip} label="Skip" variant="outline" />
        </AuthButtonContainer>
      </AuthContainer>
      {siwePanel}
    </>
  );
}

const unboundStyles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  siweBackupIcon: {
    color: 'panelForegroundIcon',
  },
  siweBackupIconContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export {
  CreateSIWEBackupMessageBase,
  CreateSIWEBackupMessage,
  SignSIWEBackupMessageForRestore,
};
