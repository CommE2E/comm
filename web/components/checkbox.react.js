// @flow
import * as React from 'react';

import css from './checkbox.css';

type Props = {
  +checked: boolean,
  +readOnly?: boolean,
};

function Checkbox(props: Props): React.Node {
  const { checked, readOnly = true } = props;
  return (
    <input
      className={css.checkbox}
      type="checkbox"
      checked={checked}
      readOnly={readOnly}
    />
  );
}

export default Checkbox;
