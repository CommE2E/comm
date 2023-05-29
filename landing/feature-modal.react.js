// @flow

import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';

import type { FeatureComparison, Competitor } from './competitor-data.js';
import CompetitorFeature from './competitor-feature.react.js';
import css from './feature-modal.css';
import typography from './typography.css';

type Props = {
  +competitor: Competitor,
  +feature: FeatureComparison,
};

function FeatureModal(props: Props): React.Node {
  const { competitor, feature } = props;

  const { popModal } = useModalContext();

  const furtherReadingClassName = classNames(
    typography.paragraph1,
    css.furtherReadingsText,
  );
  const linkClassName = classNames([typography.paragraph2, css.linkText]);

  const furtherReadingLinks = React.useMemo(() => {
    if (!feature.furtherReadingLinks) {
      return null;
    }

    const links = feature.furtherReadingLinks.map((link, index) => (
      <a key={index} href={link} target="blank" className={linkClassName}>
        {link}
      </a>
    ));

    return (
      <div className={css.furtherReadingContainer}>
        <p className={furtherReadingClassName}>Further reading</p>
        <div className={css.linksContainer}>{links}</div>
      </div>
    );
  }, [feature.furtherReadingLinks, furtherReadingClassName, linkClassName]);

  return (
    <ModalOverlay onClose={popModal} backgroundColor="var(--modal-overlay)">
      <div className={css.modalContainer}>
        <div className={css.featureContainer}>
          <CompetitorFeature
            competitorID={competitor.id}
            title={feature.title}
            comingSoon={feature.comingSoon}
            competitorDescription={feature.competitorDescriptionLong}
            commDescription={feature.commDescriptionLong}
          />
          <div className={css.closeIconContainer} onClick={popModal}>
            <FontAwesomeIcon
              icon={faTimes}
              className={css.closeIcon}
              size="lg"
            />
          </div>
        </div>
        {furtherReadingLinks}
      </div>
    </ModalOverlay>
  );
}

export default FeatureModal;
