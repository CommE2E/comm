// @flow

import * as React from 'react';

import css from './manage-invite-links-modal.css';
import Button from '../../components/button.react.js';

const buttonColor = {
  color: 'var(--purple-link)',
};

function EmptyLinkContent(): React.Node {
  return (
    <div className={css.sectionHeaderRow}>
      <div className={css.sectionHeaderText}>Public link</div>
      <Button variant="text" buttonColor={buttonColor}>
        Enable
      </Button>
    </div>
  );
}

export default EmptyLinkContent;
