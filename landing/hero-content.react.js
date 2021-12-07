// @flow

import * as React from 'react';
import TextLoop from 'react-text-loop';

import { assetMetaData } from './asset-meta-data';
import css from './hero-content.css';

function HeroContent(): React.Node {
  const [hero] = assetMetaData;

  return (
    <section className={hero.infoStyle}>
      <h1 className={css.cycling_header}>
        {'Comm is crypto-native\nchat for '}
        <TextLoop
          interval={1750}
          springConfig={{ stiffness: 180, damping: 16 }}
        >
          <span className={css.app_landing_subheading}>DAOs</span>
          <span className={css.app_landing_subheading}>art collectives</span>
          <span className={css.app_landing_subheading}>venture funds</span>
          <span className={css.app_landing_subheading}>open source</span>
          <span className={css.app_landing_subheading}>gaming guilds</span>
          <span className={css.app_landing_subheading}>social clubs</span>
        </TextLoop>
      </h1>
      <p className={css.app_landing_subheading}>
        (think &quot;Web3 Discord&quot;)
      </p>
    </section>
  );
}

export default HeroContent;
