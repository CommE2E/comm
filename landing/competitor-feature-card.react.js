// @flow

import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import CommLogo from './assets/comm-logo.react.js';
import type { Competitors } from './competitor-data.js';
import css from './competitor-feature-card.css';
import CompetitorLogo from './competitor-logo.react.js';
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

  const headingClassName = classNames([typography.heading3, css.headingText]);
  const comingSoonClassName = classNames([
    typography.paragraph3,
    css.comingSoonText,
  ]);
  const descriptionClassName = classNames([
    typography.paragraph1,
    css.descriptionText,
  ]);
  const readMoreClassName = classNames([
    typography.paragraph2,
    css.readMoreText,
  ]);

  let comingSoonBadge;
  if (comingSoon) {
    comingSoonBadge = (
      <div className={css.comingSoonBadge}>
        <FontAwesomeIcon
          size="sm"
          className={css.comingSoonIcon}
          icon={faWrench}
        />
        <span className={comingSoonClassName}>Coming Soon</span>
      </div>
    );
  }

  return (
    <a className={css.container} onClick={onClick}>
      <div className={css.headingContainer}>
        <p className={headingClassName}>{title}</p>
        {comingSoonBadge}
      </div>
      <CompetitorLogo name={competitorID} size={30} />
      <p className={descriptionClassName}>{competitorDescription}</p>
      <hr />
      <CommLogo size={30} />
      <p className={descriptionClassName}>{commDescription}</p>
      <p className={readMoreClassName}>Read more</p>
    </a>
  );
}

export default CompetitorFeatureCard;
