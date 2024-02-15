// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';

import css from './add-button.css';

type Props = {
  +onClick: () => mixed,
};

function AddButton(props: Props): React.Node {
  const { onClick } = props;

  return (
    <div onClick={onClick} className={css.container}>
      <SWMansionIcon icon="plus-small" size={24} className={css.addButton} />
    </div>
  );
}

export default AddButton;
