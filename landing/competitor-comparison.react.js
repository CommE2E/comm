// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './competitor-comparison.css';
import CompetitorLogo from './competitor-logo.react.js';
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
  const [selectedCompetitorID, setSelectedCompetitorID] =
    React.useState<string>('signal');

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

  const headerClassName = classNames([typography.heading1, css.headerText]);

  return (
    <section className={css.competitorComparisonSection}>
      <h1 className={headerClassName}>See how Comm is different</h1>
      <div className={css.competitorsContainer}>{competitorSelector}</div>
    </section>
  );
}

export default CompetitorComparison;
