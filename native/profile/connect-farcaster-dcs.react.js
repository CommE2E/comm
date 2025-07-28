// @flow

import * as React from 'react';
import { ScrollView, View } from 'react-native';

import {
  useCurrentUserFID,
  useLinkFarcasterDCs,
} from 'lib/utils/farcaster-utils.js';

import RegistrationTextInput from '../account/registration/registration-text-input.react.js';
import FarcasterPrompt from '../components/farcaster-prompt.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import { FarcasterAuthContextProvider } from '../farcaster-auth/farcaster-auth-context-provider.react.js';
import { useGetAuthToken } from '../farcaster-auth/farcaster-auth-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

type Props = {
  +onSuccess: () => void,
  +onCancel: () => void,
};

function InnerConnectFarcasterDCs(props: Props): React.Node {
  const { onSuccess, onCancel } = props;

  const [mnemonic, setMnemonic] = React.useState<?string>(null);
  const [signingInProgress, setSigningInProgress] = React.useState(false);

  const scrollViewRef =
    React.useRef<?React.ElementRef<typeof ScrollView>>(null);

  const fid = useCurrentUserFID();
  const getAuthToken = useGetAuthToken();
  const linkDCs = useLinkFarcasterDCs();

  const onConnect = React.useCallback(async () => {
    if (!mnemonic || !fid) {
      return;
    }

    setSigningInProgress(true);
    try {
      const token = await getAuthToken(fid, mnemonic);
      await linkDCs(fid, token);
      onSuccess();
    } catch (e) {
      Alert.alert(
        'Failed to connect',
        'Failed to connect to Farcaster Direct Casts. Please try again later.',
      );
    }
    setSigningInProgress(false);
  }, [getAuthToken, linkDCs, mnemonic, fid, onSuccess]);

  const onChangeMnemonicText = React.useCallback((text: string) => {
    setMnemonic(text);
  }, []);

  const onInputFocus = React.useCallback(() => {
    // Scroll to make the input fully visible when focused
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);

  let buttonVariant = 'enabled';
  if (!mnemonic) {
    buttonVariant = 'disabled';
  } else if (signingInProgress) {
    buttonVariant = 'loading';
  }

  const styles = useStyles(unboundStyles);

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>
          <FarcasterPrompt textType="connect_DC" />
          <View style={styles.inputContainer}>
            <RegistrationTextInput
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              editable={!signingInProgress}
              keyboardType="default"
              onChangeText={onChangeMnemonicText}
              onFocus={onInputFocus}
              onSubmitEditing={onConnect}
              placeholder="Wallet mnemonic"
              returnKeyType="go"
              secureTextEntry={true}
              value={mnemonic}
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          onPress={onConnect}
          label="Connect Direct Casts"
          variant={buttonVariant}
        />
        <PrimaryButton onPress={onCancel} label="Cancel" variant="outline" />
      </View>
    </>
  );
}

const unboundStyles = {
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginTop: 16,
  },
  buttonContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
};

function ConnectFarcasterDCs(props: Props): React.Node {
  return (
    <FarcasterAuthContextProvider>
      <InnerConnectFarcasterDCs {...props} />
    </FarcasterAuthContextProvider>
  );
}

export default ConnectFarcasterDCs;
