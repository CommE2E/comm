// @flow

import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { assetsCacheURLPrefix } from './asset-meta-data.js';
import css from './competitor-feature-card.css';
import typography from './typography.css';

type Props = {
  +competitorName: string,
  +competitorLogoImageURL: string,
  +title: string,
  +comingSoon: boolean,
  +competitorDescription: string,
  +commDescription: string,
  +onClick: () => mixed,
};

function CompetitorFeatureCard(props: Props): React.Node {
  const {
    competitorName,
    competitorLogoImageURL,
    title,
    comingSoon,
    competitorDescription,
    commDescription,
    onClick,
  } = props;

  const headingClasName = classNames([typography.heading3, css.headingText]);
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
        <FontAwesomeIcon size="sm" color="#DCA008" icon={faWrench} />
        <span className={comingSoonClassName}>Coming Soon</span>
      </div>
    );
  }

  return (
    <a className={css.container} onClick={onClick}>
      <div className={css.headingContainer}>
        <h1 className={headingClasName}>{title}</h1>
        {comingSoonBadge}
      </div>
      <img
        src={competitorLogoImageURL}
        alt={`${competitorName} logo`}
        className={css.compeitorLogo}
      />
      <p className={descriptionClassName}>{competitorDescription}</p>
      <hr />
      <img
        src={`${assetsCacheURLPrefix}/competitors/comm.png`}
        alt="comm logo"
        className={css.compeitorLogo}
      />
      <p className={descriptionClassName}>{commDescription}</p>
      <p className={readMoreClassName}>Read more</p>
    </a>
  );
}

export default CompetitorFeatureCard;
