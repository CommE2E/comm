// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './appearance-change-modal.css';
import Modal from '../modals/modal.react.js';

function AppearanceChangeModal(): React.Node {
  const { popModal } = useModalContext();

  const [selectedMode, setSelectedMode] = React.useState('dark');

  const onClickButton = React.useCallback(
    (mode: string) => setSelectedMode(mode),
    [],
  );

  const lightModeButtonClassName = classNames({
    [css.button]: true,
    [css.selectedButton]: selectedMode === 'light',
  });

  const darkModeButtonClassName = classNames({
    [css.button]: true,
    [css.selectedButton]: selectedMode === 'dark',
  });

  return (
    <Modal name="Appearance" onClose={popModal}>
      <div className={css.container}>
        <h1 className={css.header}>App theme</h1>
        <div className={css.buttonContainer}>
          <div
            className={lightModeButtonClassName}
            onClick={() => onClickButton('light')}
          >
            Light
          </div>
          <div
            className={darkModeButtonClassName}
            onClick={() => onClickButton('dark')}
          >
            Dark
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AppearanceChangeModal;
