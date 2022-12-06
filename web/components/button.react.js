// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

export type ButtonVariant = 'plain' | 'filled' | 'outline' | 'text';
export type ButtonColor = {
  +backgroundColor?: string,
  +color?: string,
};

export const buttonThemes: { [string]: ButtonColor } = {
  standard: {
    backgroundColor: 'var(--btn-bg-filled)',
  },
  danger: {
    backgroundColor: 'var(--btn-bg-danger)',
  },
  success: {
    backgroundColor: 'var(--btn-bg-success)',
  },
  outline: {
    backgroundColor: 'var(--btn-bg-outline)',
  },
};

export type ButtonProps = {
  ...React.ElementConfig<'button'>,
  +variant?: ButtonVariant,
  +buttonColor?: ButtonColor,
};

function Button(props: ButtonProps): React.Node {
  const {
    variant = 'plain',
    buttonColor,
    children,
    type = 'button',
    className,
    ...buttonProps
  } = props;

  const btnCls = classnames(
    {
      [css.plain]: true,
      [css.btn]: variant === 'filled' || variant === 'outline',
      [css[variant]]: true,
    },
    className,
  );

  let style = {};
  if (buttonColor) {
    style = buttonColor;
  } else if (variant === 'outline') {
    style = buttonThemes.outline;
  } else if (variant === 'filled') {
    style = buttonThemes.standard;
  }

  const wrappedChildren = React.Children.map(children, child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return <span>{child}</span>;
    }
    return child;
  });

  return (
    <button {...buttonProps} type={type} className={btnCls} style={style}>
      {wrappedChildren}
    </button>
  );
}

export default Button;
