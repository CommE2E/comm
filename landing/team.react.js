// @flow

import classNames from 'classnames';
import * as React from 'react';

import { assetsCacheURLPrefix } from './asset-meta-data.js';
import Button from './button.react.js';
import TeamProfile from './team-profile.react.js';
import css from './team.css';
import typography from './typography.css';

function Team(): React.Node {
  const onRolesClick = React.useCallback(() => {
    window.open(
      'https://www.notion.so/commapp/Comm-is-hiring-db097b0d63eb4695b32f8988c8e640fd',
      '_blank',
    );
  }, []);

  const headerClassName = classNames([typography.heading1, css.header]);
  const subheaderClassName = classNames([typography.subheading2, css.team]);

  return (
    <div className={css.wrapper}>
      <h2 className={headerClassName}>Team</h2>

      <section>
        <div className={css.headingContent}>
          <p className={subheaderClassName}>
            Comm is the keyserver company. Come join us and help build the
            future of the decentralized web!
          </p>
          <Button onClick={onRolesClick}>Open Roles</Button>
        </div>
        <div className={css.teamWrapper}>
          <TeamProfile
            name="Ashoat Tevosyan"
            role="Founder"
            githubHandle="ashoat"
            twitterHandle="ashoat"
            imageURL={`${assetsCacheURLPrefix}/ashoat.png`}
          />
          <TeamProfile
            name="Varun Dhananjaya"
            role="Software Engineer"
            githubHandle="vdhanan"
            twitterHandle="_va_run"
            imageURL={`${assetsCacheURLPrefix}/varun.jpeg`}
          />
          <TeamProfile
            name="William Wang"
            role="Software Engineer"
            imageURL={`${assetsCacheURLPrefix}/will.jpg`}
            githubHandle="wyilio"
          />
          <TeamProfile
            name="Yiannis Tselekounis"
            role="Research Scientist"
            imageURL={`${assetsCacheURLPrefix}/yiannis.jpeg`}
          />
          <TeamProfile
            name="Mark Rafferty"
            role="Recruiter"
            imageURL={`${assetsCacheURLPrefix}/mark.jpg`}
          />
        </div>
      </section>

      <h2 className={headerClassName}>Team at Software Mansion</h2>
      <section className={css.teamWrapper}>
        <TeamProfile
          name="Tomasz Pałys"
          role="Software Engineer"
          githubHandle="palys-swm"
          imageURL={`${assetsCacheURLPrefix}/tomek.png`}
        />
        <TeamProfile
          name="Kamil Kurowski"
          role="Software Engineer"
          githubHandle="xsanm"
          imageURL={`${assetsCacheURLPrefix}/kamil.jpg`}
        />
        <TeamProfile
          name="Bartłomiej Klocek"
          role="Software Engineer"
          githubHandle="barthap"
          twitterHandle="barthap10"
          imageURL={`${assetsCacheURLPrefix}/bartłomiej.jpg`}
        />
        <TeamProfile
          name="Angelika Serwa"
          role="Software Engineer"
          githubHandle="graszka22"
          imageURL={`${assetsCacheURLPrefix}/angelika.png`}
        />
        <TeamProfile
          name="Monika Kulczyńska"
          role="Project Manager"
          imageURL={`${assetsCacheURLPrefix}/monika.jpg`}
        />
      </section>
    </div>
  );
}

export default Team;
