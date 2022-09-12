// @flow
import * as React from 'react';

import css from './radio.css';

type Props = {
  +checked: boolean,
};

function Radio(props: Props): React.Node {
  const { checked } = props;
  return (
    <input className={css.radio} type="radio" checked={checked} readOnly />
  );
}

export default Radio;
