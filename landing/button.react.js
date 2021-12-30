// @flow

import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: (e: Event) => Promise<void>,
  +content: string,
};

function Button(props: Props): React.Node {
  const { onClick, content } = props;
  return (
    <button className={css.btn} onClick={onClick}>
      {content}
    </button>
  );
}

export default Button;
