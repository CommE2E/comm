// @flow

import * as React from 'react';

import css from './manage-invite-links-modal.css';
import Button from '../../components/button.react.js';

const buttonColor = {
  color: 'var(--purple-link)',
};

type Props = {
  +enterEditMode: () => mixed,
};

function EmptyLinkContent(props: Props): React.Node {
  const { enterEditMode } = props;
  return (
    <div className={css.sectionHeaderRow}>
      <div className={css.sectionHeaderText}>Public link</div>
      <Button variant="text" buttonColor={buttonColor} onClick={enterEditMode}>
        Enable
      </Button>
    </div>
  );
}

export default EmptyLinkContent;
