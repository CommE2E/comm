// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react';

import { investorsData } from './investor-data';
import InvestorProfileModal from './investor-profile-modal.react';
import InvestorProfile from './investor-profile.react';
import css from './investors.css';

function Investors(): React.Node {
  const { pushModal } = useModalContext();

  const onClickInvestorProfileCard = React.useCallback(
    (id: string) => pushModal(<InvestorProfileModal investorID={id} />),
    [pushModal],
  );

  const investors = React.useMemo(() => {
    return investorsData.map(investor => (
      <InvestorProfile
        key={investor.id}
        name={investor.name}
        description={investor.description}
        involvement={investor.involvement}
        imageURL={investor.imageURL}
        onClick={() => onClickInvestorProfileCard(investor.id)}
      />
    ));
  }, [onClickInvestorProfileCard]);

  return (
    <div className={css.wrapper}>
      <h2 className={css.header}>Investors</h2>

      <section>
        <div className={css.headingContainer}>
          <p className={css.subtitle}>
            Comm is proud to count over 80 individuals &amp; organizations from
            our community as investors.
          </p>
        </div>

        <div className={css.investorContainer}>{investors}</div>
      </section>
    </div>
  );
}

export default Investors;
