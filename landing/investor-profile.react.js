// @flow

import * as React from 'react';

import css from './investor-profile.css';

type Props = {
  +name: string,
  +description: string,
  +involvement: ?string,
  +imageURL: string,
};

function InvestorProfile(props: Props): React.Node {
  const { name, description, involvement, imageURL } = props;

  return (
    <div className={css.profile}>
      <img alt={`image of Comm investor ${name}`} src={imageURL} />
      <div className={css.investorInfoContainer}>
        <p className={css.name}>{name}</p>
        <p className={css.description}>{description}</p>
        <p className={css.involvement}>{involvement}</p>
      </div>
    </div>
  );
}

export default InvestorProfile;
