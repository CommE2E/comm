// @flow

import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import CommLogo from './assets/comm-logo.react.js';
import type { Competitors } from './competitor-data.js';
import css from './competitor-feature.css';
import CompetitorLogo from './competitor-logo.react.js';
import typography from './typography.css';

type Props = {
  +competitorID: Competitors,
  +title: string,
  +comingSoon: boolean,
  +competitorDescription: string | $ReadOnlyArray<string>,
  +commDescription: string | $ReadOnlyArray<string>,
};

function CompetitorFeature(props: Props): React.Node {
  const {
    competitorID,
    title,
    comingSoon,
    competitorDescription,
    commDescription,
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
  const descriptionMultiClassName = classNames([
    typography.paragraph1,
    css.descriptionTextMutli,
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

  const competitorInfo = React.useMemo(() => {
    if (typeof competitorDescription === 'string') {
      return <p className={descriptionClassName}>{competitorDescription}</p>;
    } else {
      const paragraphs = competitorDescription.map((paragraph, index) => {
        const className =
          index > 0 ? descriptionMultiClassName : descriptionClassName;

        return (
          <p className={className} key={paragraph}>
            {paragraph}
          </p>
        );
      });
      return <>{paragraphs}</>;
    }
  }, [competitorDescription, descriptionClassName, descriptionMultiClassName]);

  const commInfo = React.useMemo(() => {
    if (typeof commDescription === 'string') {
      return <p className={descriptionClassName}>{commDescription}</p>;
    } else {
      const paragraphs = commDescription.map((paragraph, index) => {
        const className =
          index > 0 ? descriptionMultiClassName : descriptionClassName;

        return (
          <p className={className} key={paragraph}>
            {paragraph}
          </p>
        );
      });
      return <>{paragraphs}</>;
    }
  }, [commDescription, descriptionClassName, descriptionMultiClassName]);

  return (
    <div className={css.container}>
      <div className={css.headingContainer}>
        <p className={headingClassName}>{title}</p>
        {comingSoonBadge}
      </div>
      <CompetitorLogo name={competitorID} size={30} />
      {competitorInfo}
      <hr />
      <CommLogo size={30} />
      {commInfo}
    </div>
  );
}

export default CompetitorFeature;
