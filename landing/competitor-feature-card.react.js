// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { Competitors } from './competitor-data.js';
import css from './competitor-feature-card.css';
import CompetitorFeature from './competitor-feature.react.js';
import typography from './typography.css';

type Props = {
  +competitorID: Competitors,
  +title: string,
  +comingSoon: boolean,
  +competitorDescription: string,
  +commDescription: string,
  +onClick: () => mixed,
};

function CompetitorFeatureCard(props: Props): React.Node {
  const {
    competitorID,
    title,
    comingSoon,
    competitorDescription,
    commDescription,
    onClick,
  } = props;

  const readMoreClassName = classNames([
    typography.paragraph2,
    css.readMoreText,
  ]);

  return (
    <a className={css.container} onClick={onClick}>
      <CompetitorFeature
        competitorID={competitorID}
        title={title}
        comingSoon={comingSoon}
        competitorDescription={competitorDescription}
        commDescription={commDescription}
        descriptionTextClassName={css.descriptionText}
      />
      <p className={readMoreClassName}>Read more</p>
    </a>
  );
}

export default CompetitorFeatureCard;
