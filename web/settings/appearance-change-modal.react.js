// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useUpdateThemePreference } from 'lib/hooks/theme.js';

import css from './appearance-change-modal.css';
import Modal from '../modals/modal.react.js';
import { useSelector } from '../redux/redux-utils.js';

function AppearanceChangeModal(): React.Node {
  const globalThemeInfo = useSelector(state => state.globalThemeInfo);
  const updateThemePreference = useUpdateThemePreference();

  const { popModal } = useModalContext();

  const onClickLightModeButton = React.useCallback(
    () => updateThemePreference('light'),
    [updateThemePreference],
  );

  const onClickDarkModeButton = React.useCallback(
    () => updateThemePreference('dark'),
    [updateThemePreference],
  );

  const lightModeButtonClassName = classNames({
    [css.button]: true,
    [css.selectedButton]: globalThemeInfo.preference === 'light',
  });

  const darkModeButtonClassName = classNames({
    [css.button]: true,
    [css.selectedButton]: globalThemeInfo.preference === 'dark',
  });

  return (
    <Modal name="Appearance" onClose={popModal}>
      <div className={css.container}>
        <h1 className={css.header}>App theme</h1>
        <div className={css.buttonContainer}>
          <div
            className={lightModeButtonClassName}
            onClick={onClickLightModeButton}
          >
            Light
          </div>
          <div
            className={darkModeButtonClassName}
            onClick={onClickDarkModeButton}
          >
            Dark
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AppearanceChangeModal;
