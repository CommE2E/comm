// @flow

import Icon from '@expo/vector-icons/MaterialIcons.js';
import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Alert } from 'react-native';

import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import { type RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  AccountSelection,
  AvatarData,
} from './registration-types.js';
import {
  type NavigationRoute,
  RegistrationTermsRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import { useSIWEPanelState } from '../siwe-hooks.js';
import SIWEPanel from '../siwe-panel.react.js';

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
      const { onSuccessfulWalletSignature, onExistingWalletSignature, onSkip } =
        props;
      const styles = useStyles(unboundStyles);

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
            siweMessageType={SIWEMessageTypes.MSG_BACKUP}
            setLoading={siwePanelSetLoading}
          />
        );
      }

      const newSignatureButtonText = onExistingWalletSignature
        ? 'Encrypt with new signature'
        : 'Encrypt with Ethereum signature';
      const newSignatureButtonVariant = onExistingWalletSignature
        ? 'outline'
        : 'enabled';

      let useExistingSignatureButton;
      if (onExistingWalletSignature) {
        useExistingSignatureButton = (
          <RegistrationButton
            onPress={onExistingWalletSignature}
            label="Encrypt with existing signature"
            variant="enabled"
          />
        );
      }

      let onSkipButton;
      if (onSkip) {
        onSkipButton = (
          <RegistrationButton onPress={onSkip} label="Skip" variant="outline" />
        );
      }

      return (
        <>
          <RegistrationContainer>
            <RegistrationContentContainer
              style={styles.scrollViewContentContainer}
            >
              <Text style={styles.header}>Encrypting your Comm backup</Text>
              <Text style={styles.body}>
                To make sure we can’t see your data, Comm encrypts your backup
                using a signature from your wallet.
              </Text>
              <Text style={styles.body}>
                You can always recover your data as long as you still control
                your wallet.
              </Text>
              <View style={styles.siweBackupIconContainer}>
                <Icon name="backup" size={200} style={styles.siweBackupIcon} />
              </View>
            </RegistrationContentContainer>
            <RegistrationButtonContainer>
              {useExistingSignatureButton}
              <RegistrationButton
                onPress={openPanel}
                label={newSignatureButtonText}
                variant={newSignatureButtonVariant}
              />
              {onSkipButton}
            </RegistrationButtonContainer>
          </RegistrationContainer>
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

export { CreateSIWEBackupMessageBase, CreateSIWEBackupMessage };
