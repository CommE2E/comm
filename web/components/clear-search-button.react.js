// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import Button from './button.react';
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
    <Button className={searchClassNames} onClick={onClick}>
      <SWMansionIcon icon="cross" size={12} />
    </Button>
  );
}

export default ClearSearchButton;
