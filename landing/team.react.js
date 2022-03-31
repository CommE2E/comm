// @flow

import * as React from 'react';

import { assetUrl } from './asset-meta-data.js';
import TeamProfile from './team-profile.react.js';
import css from './team.css';
function Team(): React.Node {
  return (
    <>
      <div className={css.wrapper}>
        {/* <h2 className={css.header}>Team</h2> */}
        <section className={css.teamWrapper}>
          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL={`${assetUrl}/ashoat.png`}
          />

          <TeamProfile
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atulio"
            imageURL={`${assetUrl}/atul.jpeg`}
          />
          <TeamProfile
            name="Benjamin Schachter"
            role="Software Engineer"
            githubHandle="benschac"
            twitterHandle="benschac"
            imageURL={`${assetUrl}/ben.png`}
          />
          <TeamProfile
            name="Varun Dhananjaya"
            role="Software Engineer"
            githubHandle="vdhanan"
            twitterHandle="_va_run"
            imageURL={`${assetUrl}/varun.jpeg`}
          />
          <TeamProfile
            name="Max Kalashnikoff"
            role="Software Engineer"
            githubHandle="geekbrother"
            twitterHandle="GeekMaks"
            imageURL={`${assetUrl}/max.jpeg`}
          />
        </section>
      </div>
      <div className={css.wrapper}>
        {/* <h2 className={css.header}>Team at Software Mansion</h2> */}
        <section className={css.teamWrapper}>
          <TeamProfile
            name="Tomasz Pałys"
            role="software engineer"
            githubHandle="palys-swm"
            imageURL={`${assetUrl}/tomek.png`}
          />
          <TeamProfile
            name="Karol Bisztyga"
            role="Software Engineer"
            githubHandle="karol-bisztyga"
            twitterHandle="KBisztyga"
            imageURL={`${assetUrl}/karol.jpeg`}
          />
          <TeamProfile
            name="Jacek Nitychoruk"
            role="Software Engineer"
            githubHandle="def-au1t"
            imageURL={`${assetUrl}/jacek.jpeg`}
          />
          <TeamProfile
            name="Marcin Wasowicz"
            role="Software Engineer"
            githubHandle="marcinwasowicz"
            imageURL={`${assetUrl}/marcin.jpeg`}
          />
        </section>
      </div>
    </>
  );
}

export default Team;
