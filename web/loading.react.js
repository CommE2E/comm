// @flow

import * as React from 'react';

import css from './loading.css';

function Loading(): React.Node {
  return (
    <div className={css.loadingContainer}>
      <div className={css.loading}>
        <div className={css.innerLoading}>
          <img src="images/loading_logo.svg" alt="Comm logo" />
          <span className={css.loader} />
        </div>
      </div>
    </div>
  );
}

export default Loading;
