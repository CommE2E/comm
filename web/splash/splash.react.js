// @flow

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import _merge from 'lodash/fp/merge.js';
import * as React from 'react';

import { wagmiChains } from 'lib/utils/wagmi-utils.js';

import css from './splash.css';
import LoginForm from '../account/log-in-form.react.js';

function Splash(): React.Node {
  const rainbowKitTheme = React.useMemo(() => {
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
    <div className={css.splashContainer}>
      <div className={css.loginContainer}>
        <RainbowKitProvider
          chains={wagmiChains}
          theme={rainbowKitTheme}
          modalSize="compact"
        >
          <LoginForm />
        </RainbowKitProvider>
      </div>
    </div>
  );
}

export default Splash;
