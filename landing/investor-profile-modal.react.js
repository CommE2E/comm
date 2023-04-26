// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';

import { keyedInvestorData } from './investor-data.js';
import css from './investor-profile-modal.css';
import InvestorProfile from './investor-profile.react.js';

type Props = {
  +investorID: string,
};

function InvestorProfileModal(props: Props): React.Node {
  const { investorID } = props;
  const { popModal } = useModalContext();

  const selectedInvestor = React.useMemo(() => {
    const foundInvestor = keyedInvestorData[investorID];
    if (!foundInvestor) {
      return undefined;
    }

    return (
      <InvestorProfile
        name={foundInvestor.name}
        description={foundInvestor.description}
        involvement={foundInvestor.involvement}
        imageURL={foundInvestor.imageURL}
        onClick={popModal}
        isModalActive
        website={foundInvestor.website}
        twitterHandle={foundInvestor.twitter}
        linkedinHandle={foundInvestor.linkedin}
      />
    );
  }, [investorID, popModal]);

  return (
    <ModalOverlay onClose={popModal}>
      <div className={css.modalContainer}>{selectedInvestor}</div>
    </ModalOverlay>
  );
}

export default InvestorProfileModal;
