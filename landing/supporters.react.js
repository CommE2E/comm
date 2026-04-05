// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import { shuffledSupportersData } from './supporter-data.js';
import SupporterProfileModal from './supporter-profile-modal.react.js';
import SupporterProfile from './supporter-profile.react.js';
import css from './supporters.css';
import typography from './typography.css';

function Supporters(): React.Node {
  const { pushModal } = useModalContext();

  const onClickSupporterProfileCard = React.useCallback(
    (id: string) => {
      pushModal(<SupporterProfileModal supporterID={id} />);
    },
    [pushModal],
  );

  const supporters = React.useMemo(() => {
    return shuffledSupportersData.map(supporter => (
      <SupporterProfile
        key={supporter.id}
        name={supporter.name}
        description={supporter.description}
        involvement={supporter.involvement}
        imageURL={supporter.imageURL}
        onClick={() => onClickSupporterProfileCard(supporter.id)}
        website={supporter.website}
        twitterHandle={supporter.twitter}
        linkedinHandle={supporter.linkedin}
      />
    ));
  }, [onClickSupporterProfileCard]);

  const headerClassName = classNames([typography.heading1, css.header]);
  const subheaderClassName = classNames([typography.subheading2, css.subtitle]);

  return (
    <div className={css.wrapper}>
      <h2 className={headerClassName}>Supporters</h2>

      <section>
        <div className={css.headingContainer}>
          <p className={subheaderClassName}>
            Comm is grateful to the over 80 individuals &amp; organizations from
            our community that have supported us financially and through their
            work.
          </p>
        </div>
        <div className={css.supporterContainer}>{supporters}</div>
      </section>
    </div>
  );
}

export default Supporters;
