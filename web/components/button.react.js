// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: () => mixed,
  +children: React.Node,
  +variant?: 'primary' | 'round',
};

function Button(props: Props): React.Node {
  const { onClick, children, variant } = props;
  const btnCls = classnames(css.btn, {
    [css.round]: variant === 'round',
    [css.primary]: variant === 'primary',
  });

  return (
    <button className={btnCls} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
