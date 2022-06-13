// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: (event: SyntheticEvent<HTMLButtonElement>) => mixed,
  +children: React.Node,
  +variant?: 'primary' | 'secondary' | 'danger' | 'round',
  +type?: string,
  +disabled?: boolean,
  +className?: string,
};

function Button(props: Props): React.Node {
  const {
    onClick,
    children,
    variant = 'primary',
    type,
    disabled = false,
    className = '',
  } = props;
  const btnCls = classnames(css.btn, css[variant]);

  return (
    <button
      type={type}
      className={`${btnCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
