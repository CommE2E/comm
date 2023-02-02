// @flow

import * as React from 'react';

import css from './header-separator.css';

function HeaderSeparator(): React.Node {
  return (
    <div className={css.headerSeparator}>
      <hr />
    </div>
  );
}

export default HeaderSeparator;
