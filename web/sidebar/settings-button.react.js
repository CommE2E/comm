// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './settings-button.css';

type Props = {
  +onClick: () => mixed,
  +children: React.Node,
  +variant?: 'round',
};

function SettingsButton(props: Props): React.Node {
  const { onClick, children, variant } = props;
  const btnCls = classnames(css.btn, { [css.round]: variant === 'round' });

  return (
    <button className={btnCls} onClick={onClick}>
      {children}
    </button>
  );
}

export default SettingsButton;
