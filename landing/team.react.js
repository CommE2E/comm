// @flow

import * as React from 'react';

import TeamProfile from './team-profile.react.js';
import css from './team.css';

function Team(): React.Node {
  return (
    <div className={css.wrapper}>
      <h2 className={css.header}>Team</h2>
      <section className={css.teamWrapper}>
        <TeamProfile
          name="Ashoat Tevosyan"
          role="Founder"
          githubHandle="ashoat"
          twitterHandle="ashoat"
          imageUrl="https://avatars.githubusercontent.com/u/863579?v=4"
        />
        <TeamProfile
          name="atul"
          role="Software Engineer"
          githubHandle="atulsmadhugiri"
          twitterHandle="atuli0"
          imageUrl="https://avatars.githubusercontent.com/u/32692685?v=4"
        />
        <TeamProfile
          name="Benjamin Schachter"
          role="Software Engineer"
          githubHandle="benschac"
          twitterHandle="benschac"
          imageUrl="https://avatars.githubusercontent.com/u/2502947?v=4"
        />
      </section>
    </div>
  );
}

export default Team;
