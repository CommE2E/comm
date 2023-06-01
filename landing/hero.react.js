// @flow

import * as React from 'react';

import HeroContent from './hero-content.react.js';
import css from './hero.css';
import Picture from './Picture.react.js';

type Props = {
  +url: string,
  +alt: string,
};

function Hero(props: Props): React.Node {
  const { url, alt } = props;

  return (
    <section className={css.heroSection}>
      <div className={css.heroContainer}>
        <div className={css.heroImage}>
          <Picture url={url} alt={alt} />
          <div className={css.glow} />
        </div>
        <HeroContent />
      </div>
    </section>
  );
}

export default Hero;
