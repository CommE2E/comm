// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react';
import { useModalContext } from 'lib/components/modal-provider.react';

import { keyedInvestorData } from './investor-data';
import css from './investor-profile-modal.css';
import InvestorProfile from './investor-profile.react';

type Props = {
  +investorID: string,
};

function InvestorProfileModal(props: Props): React.Node {
  const { investorID } = props;
  const { popModal } = useModalContext();

  const selectedInvestor = React.useMemo(() => {
    const foundInvestor = keyedInvestorData[investorID];
    if (!foundInvestor) {
      return;
    }

    return (
      <InvestorProfile
        name={foundInvestor.name}
        description={foundInvestor.description}
        involvement={foundInvestor.involvement}
        imageURL={foundInvestor.imageURL}
        onClick={popModal}
        isModalContent
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
