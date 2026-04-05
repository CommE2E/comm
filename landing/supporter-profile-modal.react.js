// @flow

import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';

import { keyedSupporterData } from './supporter-data.js';
import css from './supporter-profile-modal.css';
import SupporterProfile from './supporter-profile.react.js';

type Props = {
  +supporterID: string,
};

function SupporterProfileModal(props: Props): React.Node {
  const { supporterID } = props;
  const { popModal } = useModalContext();

  const selectedSupporter = React.useMemo(() => {
    const foundSupporter = keyedSupporterData[supporterID];
    if (!foundSupporter) {
      return undefined;
    }

    return (
      <SupporterProfile
        name={foundSupporter.name}
        description={foundSupporter.description}
        involvement={foundSupporter.involvement}
        imageURL={foundSupporter.imageURL}
        onClick={popModal}
        isModalActive
        website={foundSupporter.website}
        twitterHandle={foundSupporter.twitter}
        linkedinHandle={foundSupporter.linkedin}
      />
    );
  }, [supporterID, popModal]);

  return (
    <ModalOverlay onClose={popModal} backgroundColor="var(--modal-overlay)">
      <div className={css.modalContainer}>{selectedSupporter}</div>
    </ModalOverlay>
  );
}

export default SupporterProfileModal;
