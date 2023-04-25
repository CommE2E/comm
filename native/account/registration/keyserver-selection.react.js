// @flow

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';

import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import {
  RegistrationTile,
  RegistrationTileHeader,
} from './registration-tile.react.js';
import CommIcon from '../../components/comm-icon.react.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles, useColors } from '../../themes/colors.js';

type Selection = 'ashoat' | 'custom';

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

  const onSubmit = React.useCallback(() => {}, []);

  const styles = useStyles(unboundStyles);
  const colors = useColors();
  return (
    <RegistrationContainer style={styles.container}>
      <View>
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
          <TextInput
            value={customKeyserver}
            onChangeText={setCustomKeyserver}
            style={styles.keyserverInput}
            placeholderTextColor={colors.panelSecondaryForegroundBorder}
            placeholder="Keyserver"
            onFocus={onCustomKeyserverFocus}
            ref={customKeyserverTextInputRef}
          />
        </RegistrationTile>
      </View>
      <RegistrationButton onPress={onSubmit} label="Next" />
    </RegistrationContainer>
  );
}

const unboundStyles = {
  container: {
    justifyContent: 'space-between',
    flex: 1,
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
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
    fontSize: 13,
    color: 'panelForegroundSecondaryLabel',
  },
  cloud: {
    marginRight: 8,
  },
  keyserverInput: {
    color: 'panelForegroundLabel',
    borderColor: 'panelSecondaryForegroundBorder',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
  },
};

export default KeyserverSelection;
