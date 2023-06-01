// @flow

import classNames from 'classnames';
import * as React from 'react';

import { imageAssetMetaData } from './asset-meta-data.js';
import css from './hero-content.css';
import SubscriptionForm from './subscription-form.react.js';
import typography from './typography.css';

function HeroContent(): React.Node {
  const [hero] = imageAssetMetaData;

  const headerClassName = classNames([typography.display3, css.header]);
  const subheaderClassName = classNames([
    typography.subheading2,
    css.subHeader,
  ]);

  return (
    <section className={hero.infoStyle}>
      <div className={css.contentWrapper}>
        <h1 className={headerClassName}>
          Comm is an encrypted messaging app for <span>communities</span>
        </h1>
        <p className={subheaderClassName}>
          We extend Signal&rsquo;s model of E2E encryption with personal servers
          to enable richer functionality.
        </p>
        <SubscriptionForm />
      </div>
    </section>
  );
}

export default HeroContent;
