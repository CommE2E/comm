// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './hero-content.css';
import SubscriptionForm from './subscription-form.react.js';
import typography from './typography.css';

function HeroContent(): React.Node {
  const headerClassName = classNames([typography.display3, css.header]);
  const subheaderClassName = classNames([
    typography.subheading2,
    css.subHeader,
  ]);

  return (
    <section className={css.heroInfo}>
      <h1 className={headerClassName}>
        Comm is an encrypted messaging app for <span>communities</span>
      </h1>
      <p className={subheaderClassName}>
        We extend Signal&rsquo;s model of E2E encryption with personal servers
        to enable richer functionality.
      </p>
      <SubscriptionForm />
    </section>
  );
}

export default HeroContent;
