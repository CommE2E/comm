// @flow

import * as React from 'react';

import css from './investors.css';

function Investors(): React.Node {
  return (
    <div className={css.wrapper}>
      <h2 className={css.header}>Investors</h2>

      <section>
        <div className={css.headingContainer}>
          <p className={css.subtitle}>
            Comm is proud to count over 80 individuals &amp; organizations from
            our community as investors.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Investors;
