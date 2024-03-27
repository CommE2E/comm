// @flow

import * as React from 'react';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import type {
  CoolOrNerdMode,
  EthereumAccountSelection,
} from './registration-types.js';
import FarcasterPrompt from '../../components/farcaster-prompt.react.js';
import FarcasterWebView from '../../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../../components/farcaster-web-view.react.js';
import { type NavigationRoute } from '../../navigation/route-names.js';

export type ConnectFarcasterParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverURL: string,
    +ethereumAccount?: EthereumAccountSelection,
  },
};

type Props = {
  +navigation: RegistrationNavigationProp<'ConnectFarcaster'>,
  +route: NavigationRoute<'ConnectFarcaster'>,
};

// eslint-disable-next-line no-unused-vars
function ConnectFarcaster(prop: Props): React.Node {
  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const onSuccess = React.useCallback(() => {
    // TODO: implement onSuccess
  }, []);

  const onPressConnectFarcaster = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  const connectFarcaster = React.useMemo(
    () => (
      <RegistrationContainer>
        <RegistrationContentContainer style={styles.scrollViewContentContainer}>
          <FarcasterPrompt />
        </RegistrationContentContainer>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <RegistrationButtonContainer>
          <RegistrationButton
            onPress={onPressConnectFarcaster}
            label="Connect Farcaster account"
            variant={connectButtonVariant}
          />
        </RegistrationButtonContainer>
      </RegistrationContainer>
    ),
    [connectButtonVariant, onPressConnectFarcaster, onSuccess, webViewState],
  );

  return connectFarcaster;
}

const styles = {
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default ConnectFarcaster;
