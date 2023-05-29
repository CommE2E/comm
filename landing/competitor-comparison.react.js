// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './competitor-comparison.css';
import {
  competitorData,
  type Competitor,
  type FeatureComparison,
} from './competitor-data.js';
import CompetitorFeatureCard from './competitor-feature-card.react.js';
import CompetitorLogo from './competitor-logo.react.js';
import FeatureModal from './feature-modal.react.js';
import typography from './typography.css';

const competitors = [
  'signal',
  'keybase',
  'telegram',
  'discord',
  'slack',
  'matrix',
];

function CompetitorComparison(): React.Node {
  const { pushModal } = useModalContext();

  const [selectedCompetitorID, setSelectedCompetitorID] =
    React.useState<string>('signal');

  const onFeatureCardClick = React.useCallback(
    (competitor: Competitor, feature: FeatureComparison) => {
      pushModal(<FeatureModal competitor={competitor} feature={feature} />);
    },
    [pushModal],
  );

  const competitorSelector = React.useMemo(
    () =>
      competitors.map(competitor => {
        const competitorLogoClassName = classNames({
          [css.competitorLogo]: true,
          [css.activeCompetitorLogo]: selectedCompetitorID === competitor,
        });
        const bumpClassName = classNames({
          [css.bump]: selectedCompetitorID === competitor,
        });

        return (
          <div className={css.logoContainer} key={competitor}>
            <div
              className={competitorLogoClassName}
              onClick={() => setSelectedCompetitorID(competitor)}
            >
              <CompetitorLogo name={competitor} />
            </div>
            <div className={bumpClassName} />
          </div>
        );
      }),
    [selectedCompetitorID],
  );

  const featureCards = React.useMemo(() => {
    const selectedCompetitor = competitorData[selectedCompetitorID];

    return selectedCompetitor.featureComparison.map(feature => (
      <CompetitorFeatureCard
        key={`${selectedCompetitor.id}_${feature.title}`}
        competitorID={selectedCompetitor.id}
        title={feature.title}
        comingSoon={feature.comingSoon}
        competitorDescription={feature.competitorDescriptionShort}
        commDescription={feature.commDescriptionShort}
        onClick={() => onFeatureCardClick(selectedCompetitor, feature)}
      />
    ));
  }, [onFeatureCardClick, selectedCompetitorID]);

  const headerClassName = classNames([typography.heading1, css.headerText]);

  return (
    <section className={css.competitorComparisonSection}>
      <h1 className={headerClassName}>See how Comm is different</h1>
      <div className={css.competitorsContainer}>{competitorSelector}</div>
      <div className={css.featureCardsContainer}>{featureCards}</div>
    </section>
  );
}

export default CompetitorComparison;
