// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { ButtonProps } from '../../../components/button.react';
import Button from '../../../components/button.react';
import css from './submit-section.css';

type Props = {
  ...ButtonProps,
  +errorMessage?: ?string,
  +containerClassName?: string,
};

function SubmitSection(props: Props): React.Node {
  const {
    children,
    containerClassName = '',
    errorMessage,
    onClick,
    variant,
    disabled = false,
    className = '',
  } = props;

  const containerStyle = classnames(css.container, containerClassName);
  const buttonStyle = classnames(css.button, className);

  return (
    <div className={containerStyle}>
      <div className={css.error}>{errorMessage}</div>
      <Button
        type="submit"
        className={buttonStyle}
        onClick={onClick}
        disabled={disabled}
        variant={variant}
      >
        {children}
      </Button>
    </div>
  );
}

export default SubmitSection;
