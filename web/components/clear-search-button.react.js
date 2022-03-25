// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './search.css';

type ClearSearchButtonProps = {
  +active: boolean,
  +onClick: () => void,
};

function ClearSearchButton(props: ClearSearchButtonProps): React.Node {
  const { active, onClick } = props;
  const searchClassNames = classNames(css.clearSearch, {
    [css.clearSearchDisabled]: !active,
  });
  return (
    <button className={searchClassNames} onClick={onClick}>
      <SWMansionIcon icon="cross" size={12} />
    </button>
  );
}

export default ClearSearchButton;
