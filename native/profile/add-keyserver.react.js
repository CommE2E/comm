// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, Text } from 'react-native';
import { useDispatch } from 'react-redux';

import { addKeyserverActionType } from 'lib/actions/keyserver-actions.js';
import { useIsKeyserverURLValid } from 'lib/shared/keyserver-utils.js';
import type { KeyserverInfo } from 'lib/types/keyserver-types.js';
import { defaultConnectionInfo } from 'lib/types/socket-types.js';

import TextInput from '../components/text-input.react.js';
import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';

// eslint-disable-next-line no-unused-vars
function AddKeyserver(props: { ... }): React.Node {
  const { goBack, setOptions } = useNavigation();

  const dispatch = useDispatch();

  const currentUserID = useSelector(state => state.currentUserInfo?.id);

  const { panelForegroundTertiaryLabel } = useColors();
  const styles = useStyles(unboundStyles);

  const [urlInput, setUrlInput] = React.useState('');
  const [showErrorMessage, setShowErrorMessage] = React.useState(false);

  const isKeyserverURLValidCallback = useIsKeyserverURLValid(urlInput);

  const onPressSave = React.useCallback(async () => {
    setShowErrorMessage(false);
    if (!currentUserID || !urlInput) {
      return;
    }

    const isKeyserverURLValid = await isKeyserverURLValidCallback();
    if (!isKeyserverURLValid) {
      setShowErrorMessage(true);
      return;
    }

    const newKeyserverInfo: KeyserverInfo = {
      cookie: null,
      updatesCurrentAsOf: 0,
      urlPrefix: urlInput,
      connection: defaultConnectionInfo,
      lastCommunicatedPlatformDetails: null,
      deviceToken: null,
    };

    dispatch({
      type: addKeyserverActionType,
      payload: {
        keyserverAdminUserID: currentUserID,
        newKeyserverInfo,
      },
    });

    goBack();
  }, [currentUserID, dispatch, goBack, isKeyserverURLValidCallback, urlInput]);

  React.useEffect(() => {
    setOptions({
      // eslint-disable-next-line react/display-name
      headerRight: () => (
        <HeaderRightTextButton label="Save" onPress={onPressSave} />
      ),
    });
  }, [onPressSave, setOptions, styles.header]);

  const onChangeText = React.useCallback(
    (text: string) => setUrlInput(text),
    [],
  );

  const errorMessage = React.useMemo(() => {
    if (!showErrorMessage) {
      return null;
    }

    return (
      <Text style={styles.errorMessage}>
        Cannot connect to keyserver. Please check the URL or your connection and
        try again.
      </Text>
    );
  }, [showErrorMessage, styles.errorMessage]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>KEYSERVER URL</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={onChangeText}
          placeholder="Keyserver URL"
          placeholderTextColor={panelForegroundTertiaryLabel}
          autoFocus={true}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {errorMessage}
    </View>
  );
}

const unboundStyles = {
  container: {
    paddingTop: 8,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  inputContainer: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  errorMessage: {
    marginTop: 8,
    marginHorizontal: 16,
    color: 'redText',
  },
};

export default AddKeyserver;
