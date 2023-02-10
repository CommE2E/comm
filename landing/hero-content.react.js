// @flow

import * as React from 'react';
import TextLoop from 'react-text-loop';

import { assetMetaData } from './asset-meta-data.js';
import css from './hero-content.css';
import SubscriptionForm from './subscription-form.react.js';

function HeroContent(): React.Node {
  const [hero] = assetMetaData;

  return (
    <section className={hero.infoStyle}>
      <div className={css.contentWrapper}>
        <h1 className={css.cycling_header}>
          {'Comm is crypto-native\nchat for '}
          <TextLoop
            interval={1750}
            springConfig={{ stiffness: 180, damping: 16 }}
          >
            <span className={css.cycling_content}>DAOs</span>
            <span className={css.cycling_content}>venture funds</span>
            <span className={css.cycling_content}>open source</span>
            <span className={css.cycling_content}>gaming guilds</span>
            <span className={css.cycling_content}>social clubs</span>
          </TextLoop>
        </h1>
        <p className={css.sub_heading}>(think &quot;Web3 Discord&quot;)</p>
        <SubscriptionForm />
      </div>
    </section>
  );
}

export default HeroContent;
