// @flow

import * as React from 'react';

import css from './info-block.css';
import Picture from './Picture.react';

type InfoBlockProps = {
  +title: string,
  +description: string,
  +url: string,
  +alt: string,
  +css_class: string,
};
function InfoBlock(props: InfoBlockProps): React.Node {
  const { title, description, url, alt } = props;

  return (
    <section className={css.info_block}>
      <Picture {...{ url, alt }} />
      <div className={css.content}>
        <p className={css.title}>{title}</p>
        <p className={css.description}>{description}</p>
      </div>
    </section>
  );
}

export default InfoBlock;
