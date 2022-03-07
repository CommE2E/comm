// @flow

import * as React from 'react';

import TeamProfile from './team-profile.react.js';
import css from './team.css';

function Team(): React.Node {
  return (
    <>
      <div className={css.wrapper}>
        <h2 className={css.header}>Team</h2>
        <section className={css.teamWrapper}>
          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL="https://avatars.githubusercontent.com/u/863579?v=4"
          />
          <TeamProfile
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atuli0"
            imageURL="https://avatars.githubusercontent.com/u/32692685?v=4"
          />
          <TeamProfile
            name="Benjamin Schachter"
            role="Software Engineer"
            githubHandle="benschac"
            twitterHandle="benschac"
            imageURL="https://i.imgur.com/3XkVQ1H.png"
          />
          <TeamProfile
            name="Varun Dhananjaya"
            role="Software Engineer"
            githubHandle="vdhanan"
            twitterHandle="_va_run"
            imageURL="https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F0f7471e7-e16b-45b1-bb7b-567d2ac5af44%2F1567382183343.jpeg?table=block&id=2f851c24-8cd6-412a-b8a9-0d989e3c2fbc&spaceId=3a3549de-adc7-4702-88ab-ca7eaf32792e&width=2000&userId=a7a3d7f5-a72b-45c3-8719-06e288a6c405&cache=v2"
          />
        </section>
      </div>
      <div className={css.wrapper}>
        <h2 className={css.header}>Team at Software Mansion</h2>
        <section className={css.teamWrapper}>
          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL="https://avatars.githubusercontent.com/u/863579?v=4"
          />
          <TeamProfile
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atuli0"
            imageURL="https://avatars.githubusercontent.com/u/32692685?v=4"
          />
          <TeamProfile
            name="Benjamin Schachter"
            role="Software Engineer"
            githubHandle="benschac"
            twitterHandle="benschac"
            imageURL="https://i.imgur.com/3XkVQ1H.png"
          />
          <TeamProfile
            name="Varun Dhananjaya"
            role="Software Engineer"
            githubHandle="vdhanan"
            twitterHandle="_va_run"
            imageURL="https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F0f7471e7-e16b-45b1-bb7b-567d2ac5af44%2F1567382183343.jpeg?table=block&id=2f851c24-8cd6-412a-b8a9-0d989e3c2fbc&spaceId=3a3549de-adc7-4702-88ab-ca7eaf32792e&width=2000&userId=a7a3d7f5-a72b-45c3-8719-06e288a6c405&cache=v2"
          />
          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL="https://avatars.githubusercontent.com/u/863579?v=4"
          />
          <TeamProfile
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atuli0"
            imageURL="https://avatars.githubusercontent.com/u/32692685?v=4"
          />

          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL="https://avatars.githubusercontent.com/u/863579?v=4"
          />
          <TeamProfile
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atuli0"
            imageURL="https://avatars.githubusercontent.com/u/32692685?v=4"
          />
        </section>
      </div>
    </>
  );
}

export default Team;
