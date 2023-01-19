// @flow

import '@rainbow-me/rainbowkit/dist/index.css';

import {
  ConnectButton,
  darkTheme,
  getDefaultWallets,
  RainbowKitProvider,
  useConnectModal,
} from '@rainbow-me/rainbowkit';
import _merge from 'lodash/fp/merge';
import * as React from 'react';
import { FaEthereum } from 'react-icons/fa';
import {
  chain,
  configureChains,
  createClient,
  useSigner,
  WagmiConfig,
} from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
} from 'lib/actions/siwe-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import LoadingIndicator from '../loading-indicator.react';
import { useSelector } from '../redux/redux-utils';
import css from './siwe.css';

// details can be found https://0.6.x.wagmi.sh/docs/providers/configuring-chains
const availableProviders = process.env.COMM_ALCHEMY_KEY
  ? [alchemyProvider({ apiKey: process.env.COMM_ALCHEMY_KEY })]
  : [publicProvider()];
const { chains, provider } = configureChains(
  [chain.mainnet],
  availableProviders,
);

const { connectors } = getDefaultWallets({
  appName: 'comm',
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
function SIWE(): React.Node {
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const dispatchActionPromise = useDispatchActionPromise();
  const getSIWENonceCall = useServerCall(getSIWENonce);
  const getSIWENonceCallLoadingStatus = useSelector(
    getSIWENonceLoadingStatusSelector,
  );

  const [siweNonce, setSIWENonce] = React.useState<?string>(null);

  React.useEffect(() => {
    if (!signer) {
      setSIWENonce(null);
      return;
    }
    dispatchActionPromise(
      getSIWENonceActionTypes,
      (async () => {
        const response = await getSIWENonceCall();
        setSIWENonce(response);
      })(),
    );
  }, [dispatchActionPromise, getSIWENonceCall, signer]);

  const siweButtonColor = React.useMemo(
    () => ({ backgroundColor: 'white', color: 'black' }),
    [],
  );

  let siweLoginForm;
  if (signer && !siweNonce) {
    siweLoginForm = (
      <div className={css.connectButtonContainer}>
        <LoadingIndicator
          status={getSIWENonceCallLoadingStatus}
          size="medium"
        />
      </div>
    );
  } else if (signer) {
    siweLoginForm = (
      <div className={css.connectButtonContainer}>
        <ConnectButton />
      </div>
    );
  }

  const onSIWEButtonClick = React.useCallback(() => {
    openConnectModal && openConnectModal();
  }, [openConnectModal]);

  let siweButton;
  if (openConnectModal) {
    siweButton = (
      <>
        <Button
          onClick={onSIWEButtonClick}
          variant="filled"
          buttonColor={siweButtonColor}
        >
          <div className={css.ethereumLogoContainer}>
            <FaEthereum />
          </div>
          Sign in with Ethereum
        </Button>
      </>
    );
  }
  return (
    <div className={css.siweContainer}>
      <hr />
      {siweLoginForm}
      {siweButton}
    </div>
  );
}

function SIWEWrapper(): React.Node {
  const theme = React.useMemo(() => {
    return _merge(darkTheme())({
      radii: {
        modal: 0,
        modalMobile: 0,
      },
      colors: {
        modalBackdrop: '#242529',
      },
    });
  }, []);
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains} theme={theme} modalSize="compact">
        <SIWE />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default SIWEWrapper;
