// @flow

import * as React from 'react';
import { FaEthereum } from 'react-icons/fa';

import Button from '../components/button.react';
import css from './siwe.css';

type SIWEButtonProps = {
  +onSIWEButtonClick: () => void,
};
function SIWEButton(props: SIWEButtonProps): React.Node {
  const { onSIWEButtonClick } = props;

  const siweButtonColor = React.useMemo(
    () => ({ backgroundColor: 'white', color: 'black' }),
    [],
  );

  return (
    <div className={css.siweContainer}>
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
    </div>
  );
}

export default SIWEButton;
