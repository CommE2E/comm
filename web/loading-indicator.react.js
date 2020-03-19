// @flow

import type { LoadingStatus } from 'lib/types/loading-types';

import React from 'react';
import classNames from 'classnames';

import css from './style.css';

type Props = {
  status: LoadingStatus,
  size?: 'small' | 'medium' | 'large',
  color?: 'black' | 'white',
  loadingClassName?: string,
  errorClassName?: string,
};

export default function LoadingIndicator(props: Props) {
  const size = props.size ? props.size : 'small';
  const color = props.color ? props.color : 'white';
  if (props.status === 'loading') {
    const classNameInput = {
      [css['loading-indicator-loading']]: size === 'medium',
      [css['loading-indicator-loading-small']]: size === 'small',
      [css['loading-indicator-loading-large']]: size === 'large',
      [css['loading-indicator-black']]: color === 'black',
    };
    if (props.loadingClassName) {
      classNameInput[props.loadingClassName] = true;
    }
    return <span className={classNames(classNameInput)} />;
  } else if (props.status === 'error') {
    const classNameInput = {
      [css['loading-indicator-error']]: true,
      [css['loading-indicator-error-black']]: color === 'black',
    };
    if (props.errorClassName) {
      classNameInput[props.errorClassName] = true;
    }
    return <span className={classNames(classNameInput)}>!</span>;
  } else {
    return null;
  }
}
