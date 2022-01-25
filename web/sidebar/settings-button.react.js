// @flow

import * as React from 'react';

import css from './settings-button.css';

type Props = {
  +onClick: () => mixed,
  +children: React.Node,
};

function SettingsButton(props: Props): React.Node {
  const { onClick, children } = props;
  return (
    <button className={css.btn} onClick={onClick}>
      {children}
    </button>
  );
}

export default SettingsButton;
