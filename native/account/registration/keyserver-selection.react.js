// @flow

import * as React from 'react';
import { Text } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import RegistrationTextInput from './registration-text-input.react.js';
import {
  RegistrationTile,
  RegistrationTileHeader,
} from './registration-tile.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import CommIcon from '../../components/comm-icon.react.js';
import {
  type NavigationRoute,
  ConnectEthereumRouteName,
} from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

type Selection = 'ashoat' | 'custom';

export type KeyserverSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'KeyserverSelection'>,
  +route: NavigationRoute<'KeyserverSelection'>,
};
// eslint-disable-next-line no-unused-vars
function KeyserverSelection(props: Props): React.Node {
  const [customKeyserver, setCustomKeyserver] = React.useState('');
  const customKeyserverTextInputRef = React.useRef();

  const [currentSelection, setCurrentSelection] = React.useState<?Selection>();
  const selectAshoat = React.useCallback(() => {
    setCurrentSelection('ashoat');
    customKeyserverTextInputRef.current?.blur();
  }, []);
  const customKeyserverEmpty = !customKeyserver;
  const selectCustom = React.useCallback(() => {
    setCurrentSelection('custom');
    if (customKeyserverEmpty) {
      customKeyserverTextInputRef.current?.focus();
    }
  }, [customKeyserverEmpty]);
  const onCustomKeyserverFocus = React.useCallback(() => {
    setCurrentSelection('custom');
  }, []);

  let keyserverUsername;
  if (currentSelection === 'ashoat') {
    keyserverUsername = 'ashoat';
  } else if (currentSelection === 'custom' && customKeyserver) {
    keyserverUsername = customKeyserver;
  }

  const buttonState = keyserverUsername ? 'enabled' : 'disabled';

  const { navigate } = props.navigation;
  const { coolOrNerdMode } = props.route.params.userSelections;
  const onSubmit = React.useCallback(() => {
    if (!keyserverUsername) {
      return;
    }
    navigate<'ConnectEthereum'>({
      name: ConnectEthereumRouteName,
      params: { userSelections: { coolOrNerdMode, keyserverUsername } },
    });
  }, [navigate, coolOrNerdMode, keyserverUsername]);

  const styles = useStyles(unboundStyles);
  const colors = useColors();
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Select a keyserver to join</Text>
        <Text style={styles.body}>
          Chat communities on Comm are hosted on keyservers, which are
          user-operated backends.
        </Text>
        <Text style={styles.body}>
          Keyservers allow Comm to offer strong privacy guarantees without
          sacrificing functionality.
        </Text>
        <RegistrationTile
          selected={currentSelection === 'ashoat'}
          onSelect={selectAshoat}
        >
          <RegistrationTileHeader>
            <CommIcon
              name="cloud-filled"
              size={16}
              color={colors.panelForegroundLabel}
              style={styles.cloud}
            />
            <Text style={styles.tileTitleText}>ashoat</Text>
          </RegistrationTileHeader>
          <Text style={styles.tileBody}>
            Ashoat is Comm’s founder, and his keyserver currently hosts most of
            the communities on Comm.
          </Text>
        </RegistrationTile>
        <RegistrationTile
          selected={currentSelection === 'custom'}
          onSelect={selectCustom}
        >
          <RegistrationTileHeader>
            <Text style={styles.tileTitleText}>Enter a keyserver</Text>
          </RegistrationTileHeader>
          <RegistrationTextInput
            value={customKeyserver}
            onChangeText={setCustomKeyserver}
            placeholder="Keyserver"
            onFocus={onCustomKeyserverFocus}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            ref={customKeyserverTextInputRef}
          />
        </RegistrationTile>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onSubmit}
          label="Next"
          variant={buttonState}
        />
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
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
  tileTitleText: {
    flex: 1,
    fontSize: 18,
    color: 'panelForegroundLabel',
  },
  tileBody: {
    fontFamily: 'Arial',
    fontSize: 13,
    color: 'panelForegroundSecondaryLabel',
  },
  cloud: {
    marginRight: 8,
  },
};

export default KeyserverSelection;
