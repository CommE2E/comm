// @flow

import * as React from 'react';

import css from './star-background.css';

function StarBackground(): React.Node {
  return (
    <div>
      <div className={css.stars_small} />
      <div className={css.stars_medium} />
      <div className={css.stars_large} />
    </div>
  );
}

export default StarBackground;
