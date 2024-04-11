// @flow

import Icon from '@expo/vector-icons/MaterialCommunityIcons.js';
import * as React from 'react';
import { View, Text } from 'react-native';

import { type SIWEResult, SIWEMessageTypes } from 'lib/types/siwe-types.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
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
import SIWEPanel from '../siwe-panel.react.js';

export type CreateSIWEBackupMessageParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverURL: string,
    +farcasterID: ?string,
    +accountSelection: AccountSelection,
    +avatarData: ?AvatarData,
  },
};

type PanelState = 'closed' | 'opening' | 'open' | 'closing';

type Props = {
  +navigation: RegistrationNavigationProp<'CreateSIWEBackupMessage'>,
  +route: NavigationRoute<'CreateSIWEBackupMessage'>,
};
function CreateSIWEBackupMessage(props: Props): React.Node {
  const { navigate } = props.navigation;
  const { params } = props.route;

  const styles = useStyles(unboundStyles);

  const secureWithEthereumWalletText = 'Secure with Ethereum Wallet';
  const secureWithEthereumWalletVariant = 'enabled';
  const [panelState, setPanelState] = React.useState<PanelState>('closed');

  const openPanel = React.useCallback(() => {
    setPanelState('opening');
  }, []);
  const onPanelClosed = React.useCallback(() => {
    setPanelState('closed');
  }, []);
  const onPanelClosing = React.useCallback(() => {
    setPanelState('closing');
  }, []);

  const siwePanelSetLoading = React.useCallback(
    (loading: boolean) => {
      if (panelState === 'closing' || panelState === 'closed') {
        return;
      }
      setPanelState(loading ? 'opening' : 'open');
    },
    [panelState],
  );

  const onSuccessfulWalletSignature = React.useCallback(
    (result: SIWEResult) => {
      console.log(result);
      navigate<'RegistrationTerms'>({
        name: RegistrationTermsRouteName,
        params,
      });
    },
    [navigate, params],
  );

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
  const body = (
    <Text style={styles.body}>
      Comm encrypts user backup so that out backend is not able to see user
      data.
    </Text>
  );

  return (
    <>
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <Text style={styles.header}>Encrypting your Comm Backup</Text>
          {body}
          <View style={styles.siweBackupRestoreIconContainer}>
            <Icon
              name="backup-restore"
              size={200}
              style={styles.siweBackupRestoreIcon}
            />
          </View>
        </RegistrationContentContainer>
        <RegistrationButtonContainer>
          <RegistrationButton
            label={secureWithEthereumWalletText}
            variant={secureWithEthereumWalletVariant}
            onPress={openPanel}
          />
        </RegistrationButtonContainer>
      </RegistrationContainer>
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
  siweBackupRestoreIcon: {
    color: 'panelForegroundIcon',
  },
  siweBackupRestoreIconContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default CreateSIWEBackupMessage;
