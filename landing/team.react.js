// @flow

import * as React from 'react';

import { assetsCacheURLPrefix } from './asset-meta-data.js';
import Button from './button.react.js';
import TeamProfile from './team-profile.react.js';
import css from './team.css';

function Team(): React.Node {
  const onRolesClick = React.useCallback(() => {
    window.open(
      'https://www.notion.so/commapp/Comm-is-hiring-db097b0d63eb4695b32f8988c8e640fd',
      '_blank',
    );
  }, []);

  return (
    <div className={css.wrapper}>
      <h2 className={css.header}>Team</h2>

      <section>
        <div className={css.headingContent}>
          <p className={css.team}>
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
            name="atul"
            role="Software Engineer"
            githubHandle="atulsmadhugiri"
            twitterHandle="atuli0"
            imageURL={`${assetsCacheURLPrefix}/atul.jpeg`}
          />
          <TeamProfile
            name="Varun Dhananjaya"
            role="Software Engineer"
            githubHandle="vdhanan"
            twitterHandle="_va_run"
            imageURL={`${assetsCacheURLPrefix}/varun.jpeg`}
          />
          <TeamProfile
            name="Max Kalashnikoff"
            role="Software Engineer"
            githubHandle="geekbrother"
            twitterHandle="GeekMaks"
            imageURL={`${assetsCacheURLPrefix}/max.jpeg`}
          />
          <TeamProfile
            name="Jon Ringer"
            role="Software Engineer"
            githubHandle="jonringer"
            imageURL={`${assetsCacheURLPrefix}/jon.jpg`}
          />
          <TeamProfile
            name="Mark Rafferty"
            role="Recruiter"
            imageURL={`${assetsCacheURLPrefix}/mark.jpg`}
          />
          <TeamProfile
            name="Anunay Kulshrestha"
            role="Research Scientist"
            imageURL={`${assetsCacheURLPrefix}/anunay.jpg`}
          />
          <TeamProfile
            name="Ginsu Eddy"
            role="Software Engineer"
            githubHandle="ginsueddy"
            twitterHandle="ginsueddy"
            imageURL={`${assetsCacheURLPrefix}/ginsu.jpg`}
          />
          <TeamProfile
            name="Ted Chang"
            role="Product Designer"
            twitterHandle="ted__chang"
            imageURL={`${assetsCacheURLPrefix}/ted.jpg`}
          />
        </div>
      </section>

      <h2 className={css.header}>Team at Software Mansion</h2>
      <section className={css.teamWrapper}>
        <TeamProfile
          name="Tomasz Pałys"
          role="Software Engineer"
          githubHandle="palys-swm"
          imageURL={`${assetsCacheURLPrefix}/tomek.png`}
        />
        <TeamProfile
          name="Marcin Wasowicz"
          role="Software Engineer"
          githubHandle="marcinwasowicz"
          imageURL={`${assetsCacheURLPrefix}/marcin.jpeg`}
        />
        <TeamProfile
          name="Inka Sokolowska"
          role="Software Engineer"
          githubHandle="InkaAlicja"
          imageURL={`${assetsCacheURLPrefix}/inka.jpg`}
        />
        <TeamProfile
          name="Kamil Kurowski"
          role="Software Engineer"
          githubHandle="xsanm"
          imageURL={`${assetsCacheURLPrefix}/kamil.jpg`}
        />
        <TeamProfile
          name="Michał Gniadek"
          role="Software Engineer"
          githubHandle="MichalGniadek"
          imageURL={`${assetsCacheURLPrefix}/michał.jpg`}
        />
        <TeamProfile
          name="Bartłomiej Klocek"
          role="Software Engineer"
          githubHandle="barthap"
          twitterHandle="barthap10"
          imageURL={`${assetsCacheURLPrefix}/bartłomiej.jpg`}
        />
        <TeamProfile
          name="Aleksandra Grzęda"
          role="Project Manager"
          imageURL={`${assetsCacheURLPrefix}/aleksandra.jpg`}
        />
      </section>
    </div>
  );
}

export default Team;
