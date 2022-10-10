// @flow

import * as React from 'react';

import css from './investor-profile.css';

type Props = {
  +name: string,
  +description: string,
  +involvement: ?string,
  +imageURL: string,
  +onClick: () => void,
};

function InvestorProfile(props: Props): React.Node {
  const { name, description, involvement, imageURL, onClick } = props;

  return (
    <a className={css.profile} onClick={onClick}>
      <img alt={`image of Comm investor ${name}`} src={imageURL} />
      <div className={css.investorInfoContainer}>
        <p className={css.name}>{name}</p>
        <p className={css.description}>{description}</p>
        <p className={css.involvement}>{involvement}</p>
      </div>
    </a>
  );
}

export default InvestorProfile;
