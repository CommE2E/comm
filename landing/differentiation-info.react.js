// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import {
  competitors,
  competitorData,
  type FeatureComparison,
} from './competitor-data.js';
import CompetitorFeatureCard from './competitor-feature-card.react.js';
import css from './differentiation-info.css';
import FeatureModal from './feature-modal.react.js';
import typography from './typography.css';

function DifferentiationInfo(): React.Node {
  const { pushModal } = useModalContext();

  const generalCompetitorData = competitorData[competitors.GENERAL];

  const onFeatureCardClick = React.useCallback(
    (feature: FeatureComparison) => {
      pushModal(
        <FeatureModal competitor={generalCompetitorData} feature={feature} />,
      );
    },
    [pushModal, generalCompetitorData],
  );

  const featureCards = React.useMemo(
    () =>
      generalCompetitorData.featureComparison.map(feature => (
        <CompetitorFeatureCard
          key={`${generalCompetitorData.id}_${feature.title}`}
          competitorID={generalCompetitorData.id}
          title={feature.title}
          comingSoon={feature.comingSoon}
          competitorDescription={feature.competitorDescriptionShort}
          commDescription={feature.commDescriptionShort}
          onClick={() => onFeatureCardClick(feature)}
        />
      )),
    [
      generalCompetitorData.featureComparison,
      generalCompetitorData.id,
      onFeatureCardClick,
    ],
  );

  const headerClassName = classNames([typography.heading1, css.headerText]);

  return (
    <section className={css.sectionContainer}>
      <h1 className={headerClassName}>Learn about Comm</h1>
      <div className={css.cardsContainer}>{featureCards}</div>
    </section>
  );
}

export default DifferentiationInfo;
