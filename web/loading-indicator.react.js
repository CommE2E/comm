// @flow

import classNames from 'classnames';
import * as React from 'react';
import tinycolor from 'tinycolor2';

import type { LoadingStatus } from 'lib/types/loading-types.js';

import css from './style.css';

type Props = {
  +status: LoadingStatus,
  +size?: 'small' | 'medium' | 'large',
  +color?: 'black' | 'white',
  +loadingClassName?: string,
  +errorClassName?: string,
};
export default function LoadingIndicator(props: Props): React.Node {
  const [hasRendered, setHasRendered] = React.useState(false);
  React.useEffect(() => {
    setHasRendered(true);
  }, []);

  const size = props.size ? props.size : 'small';
  const color = props.color ? props.color : 'white';
  if (props.status === 'loading') {
    const classNameInput = {
      [css['loading-indicator-loading']]: true,
      [css['loading-indicator-loading-medium']]:
        hasRendered && size === 'medium',
      [css['loading-indicator-loading-small']]: hasRendered && size === 'small',
      [css['loading-indicator-loading-large']]: hasRendered && size === 'large',
      [css['loading-indicator-black']]:
        hasRendered && tinycolor.equals(color, 'black'),
    };
    if (props.loadingClassName) {
      classNameInput[props.loadingClassName] = true;
    }
    return <span className={classNames(classNameInput)} />;
  } else if (props.status === 'error') {
    const classNameInput = {
      [css['loading-indicator-error']]: true,
      [css['loading-indicator-error-black']]: tinycolor.equals(color, 'black'),
    };
    if (props.errorClassName) {
      classNameInput[props.errorClassName] = true;
    }
    return <span className={classNames(classNameInput)}>!</span>;
  } else {
    return null;
  }
}
