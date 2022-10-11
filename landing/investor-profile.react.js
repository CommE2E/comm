// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './investor-profile.css';

type Props = {
  +name: string,
  +description: string,
  +involvement: ?string,
  +imageURL: string,
  +onClick: () => void,
  +isModalContent?: boolean,
};

function InvestorProfile(props: Props): React.Node {
  const {
    name,
    description,
    involvement,
    imageURL,
    onClick,
    isModalContent,
  } = props;

  const profileContainerClassName = React.useMemo(
    () =>
      classNames({
        [css.profile]: true,
        [css.profileModal]: isModalContent,
      }),
    [isModalContent],
  );

  const descriptionClassName = React.useMemo(
    () =>
      classNames({
        [css.description]: true,
        [css.descriptionModal]: isModalContent,
      }),
    [isModalContent],
  );

  return (
    <a className={profileContainerClassName} onClick={onClick}>
      <img alt={`image of Comm investor ${name}`} src={imageURL} />
      <div className={css.investorInfoContainer}>
        <p className={css.name}>{name}</p>
        <p className={descriptionClassName}>{description}</p>
        <p className={css.involvement}>{involvement}</p>
      </div>
    </a>
  );
}

export default InvestorProfile;
