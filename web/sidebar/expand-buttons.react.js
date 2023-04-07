// @flow

import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import css from './expand-buttons.css';
import Button from '../components/button.react.js';

type Props = {
  +onClick?: ?() => mixed,
  +expanded?: boolean,
  +disabled?: boolean,
};

function ExpandButton(props: Props): React.Node {
  const { onClick, expanded = false, disabled } = props;
  const icon = expanded ? faCaretDown : faCaretRight;

  const iconClass = classNames({
    [css.disabledButtonIcon]: disabled,
    [css.buttonIcon]: !disabled,
  });

  return (
    <Button onClick={onClick} className={css.button} disabled={disabled}>
      <FontAwesomeIcon icon={icon} className={iconClass} />
    </Button>
  );
}

export { ExpandButton };
