// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View, TextInput } from 'react-native';

import { getVersionActionTypes } from 'lib/actions/device-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useIsKeyserverURLValid } from 'lib/shared/keyserver-utils.js';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { RegistrationContext } from './registration-context.js';
import RegistrationTextInput from './registration-text-input.react.js';
import {
  RegistrationTile,
  RegistrationTileHeader,
} from './registration-tile.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import CommIcon from '../../components/comm-icon.react.js';
import PrimaryButton from '../../components/primary-button.react.js';
import {
  type NavigationRoute,
  ConnectFarcasterRouteName,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles, useColors } from '../../themes/colors.js';
import { defaultURLPrefix } from '../../utils/url-utils.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

type Selection = 'ashoat' | 'custom';

export type KeyserverSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
  },
};

const getVersionLoadingStatusSelector = createLoadingStatusSelector(
  getVersionActionTypes,
);

type KeyserverSelectionError = 'cant_reach_keyserver';

type Props = {
  +navigation: AuthNavigationProp<'KeyserverSelection'>,
  +route: NavigationRoute<'KeyserverSelection'>,
};
function KeyserverSelection(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const initialKeyserverURL = cachedSelections.keyserverURL;
  const [customKeyserver, setCustomKeyserver] = React.useState(
    initialKeyserverURL === defaultURLPrefix ? '' : initialKeyserverURL,
  );
  const customKeyserverTextInputRef =
    React.useRef<?React.ElementRef<typeof TextInput>>();

  let initialSelection;
  if (initialKeyserverURL === defaultURLPrefix) {
    initialSelection = 'ashoat';
  } else if (initialKeyserverURL) {
    initialSelection = 'custom';
  }

  const [error, setError] = React.useState<?KeyserverSelectionError>();

  const [currentSelection, setCurrentSelection] =
    React.useState<?Selection>(initialSelection);
  const selectAshoat = React.useCallback(() => {
    setCurrentSelection('ashoat');
    customKeyserverTextInputRef.current?.blur();
    if (currentSelection !== 'ashoat') {
      setError(undefined);
    }
  }, [currentSelection]);
  const customKeyserverEmpty = !customKeyserver;
  const selectCustom = React.useCallback(() => {
    setCurrentSelection('custom');
    if (customKeyserverEmpty) {
      customKeyserverTextInputRef.current?.focus();
    }
    if (currentSelection !== 'custom') {
      setError(undefined);
    }
  }, [customKeyserverEmpty, currentSelection]);
  const onCustomKeyserverFocus = React.useCallback(() => {
    setCurrentSelection('custom');
    setError(undefined);
  }, []);

  let keyserverURL;
  if (currentSelection === 'ashoat') {
    keyserverURL = defaultURLPrefix;
  } else if (currentSelection === 'custom' && customKeyserver) {
    keyserverURL = customKeyserver;
  }

  const versionLoadingStatus = useSelector(getVersionLoadingStatusSelector);
  let buttonState = keyserverURL ? 'enabled' : 'disabled';
  if (versionLoadingStatus === 'loading') {
    buttonState = 'loading';
  }

  const isKeyserverURLValidPromiseCallback =
    useIsKeyserverURLValid(keyserverURL);

  const { navigate } = props.navigation;
  const { coolOrNerdMode } = props.route.params.userSelections;

  const onSubmit = React.useCallback(async () => {
    setError(undefined);

    const isKeyserverURLValid = await isKeyserverURLValidPromiseCallback();

    if (!isKeyserverURLValid) {
      setError('cant_reach_keyserver');
      return;
    }

    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      keyserverURL,
    }));

    const userSelections = { coolOrNerdMode, keyserverURL };
    navigate<'ConnectFarcaster'>({
      name: ConnectFarcasterRouteName,
      params: { userSelections },
    });
  }, [
    keyserverURL,
    isKeyserverURLValidPromiseCallback,
    setCachedSelections,
    navigate,
    coolOrNerdMode,
  ]);

  const styles = useStyles(unboundStyles);
  let errorText;
  if (error === 'cant_reach_keyserver') {
    errorText = (
      <Text style={styles.errorText}>Can&rsquo;t reach that keyserver :(</Text>
    );
  }

  const colors = useColors();
  return (
    <AuthContainer>
      <AuthContentContainer>
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
            placeholder="Keyserver URL"
            onFocus={onCustomKeyserverFocus}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            keyboardType="url"
            autoCorrect={false}
            autoCapitalize="none"
            ref={customKeyserverTextInputRef}
          />
        </RegistrationTile>
        <View style={styles.error}>{errorText}</View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton onPress={onSubmit} label="Next" variant={buttonState} />
      </AuthButtonContainer>
    </AuthContainer>
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
  error: {
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'redText',
  },
};

export default KeyserverSelection;
