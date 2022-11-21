// @flow

import { faTwitter, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import css from './investor-profile.css';

type Props = {
  +name: string,
  +description: string,
  +involvement?: string,
  +imageURL: string,
  +onClick: () => void,
  +isModalActive?: boolean,
  +website?: string,
  +twitterHandle?: string,
  +linkedinHandle?: string,
};

function InvestorProfile(props: Props): React.Node {
  const {
    name,
    description,
    involvement,
    imageURL,
    onClick,
    isModalActive,
    website,
    twitterHandle,
    linkedinHandle,
  } = props;

  const profileContainerClassName = classNames({
    [css.profile]: true,
    [css.profileModal]: isModalActive,
  });

  const descriptionClassName = classNames({
    [css.description]: true,
    [css.descriptionModal]: isModalActive,
  });

  const stopPropagation = React.useCallback(e => e.stopPropagation(), []);

  let websiteIcon;
  if (website) {
    websiteIcon = (
      <a
        href={website}
        target="_blank"
        rel="noreferrer"
        onClick={stopPropagation}
      >
        <FontAwesomeIcon icon={faGlobe} size="lg" />
      </a>
    );
  }

  let twitterIcon;
  if (twitterHandle) {
    twitterIcon = (
      <a
        href={`https://twitter.com/${twitterHandle}`}
        target="_blank"
        rel="noreferrer"
        onClick={stopPropagation}
      >
        <FontAwesomeIcon icon={faTwitter} size="lg" />
      </a>
    );
  }

  let linkedinIcon;
  if (linkedinHandle) {
    linkedinIcon = (
      <a
        href={`https://linkedin.com/${linkedinHandle}`}
        target="_blank"
        rel="noreferrer"
        onClick={stopPropagation}
      >
        <FontAwesomeIcon icon={faLinkedin} size="lg" />
      </a>
    );
  }

  return (
    <a className={profileContainerClassName} onClick={onClick}>
      <img alt={`image of Comm investor ${name}`} src={imageURL} />
      <div className={css.investorInfoContainer}>
        <p className={css.name}>{name}</p>
        <p className={descriptionClassName}>{description}</p>
        <p className={css.involvement}>{involvement}</p>
        <span>
          {websiteIcon}
          {twitterIcon}
          {linkedinIcon}
        </span>
      </div>
    </a>
  );
}

export default InvestorProfile;
