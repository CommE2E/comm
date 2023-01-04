// @flow

import { faCaretDown, faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import Button from '../components/button.react';
import css from './expand-buttons.css';

type Props = {
  +onClick: () => void,
  +expanded: boolean,
};

function ExpandButton(props: Props): React.Node {
  const icon = props.expanded ? faCaretDown : faCaretRight;

  return (
    <div className={css.wrapper}>
      <Button onClick={props.onClick}>
        <div className={css.sizeContainer}>
          <FontAwesomeIcon icon={icon} className={css.button} />
        </div>
      </Button>
    </div>
  );
}

function ExpandButtonDisabled(): React.Node {
  return (
    <div className={classNames(css.wrapper, css.sizeContainer)}>
      <FontAwesomeIcon icon={faCaretRight} className={css.disabledButton} />
    </div>
  );
}

export { ExpandButton, ExpandButtonDisabled };
