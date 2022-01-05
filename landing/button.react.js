// @flow

import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: (e: Event) => Promise<void>,
  +children?: React.Node,
};

function Button(props: Props): React.Node {
  const { onClick, children } = props;
  return (
    <button className={css.btn} onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
