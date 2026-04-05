// @flow

import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import landingCSS from './landing.css';
import css from './story.css';
import typography from './typography.css';

function Story(): React.Node {
  const headingClassName = classNames([typography.heading1, css.heading]);
  const paragraphClassName = classNames([typography.paragraph1, css.paragraph]);
  const linkClassName = classNames([landingCSS.link, css.link]);

  return (
    <main className={css.container}>
      <div className={css.content}>
        <h1 className={headingClassName}>Story</h1>

        <p className={paragraphClassName}>
          Comm was founded in 2016 as a personal project for{' '}
          <a
            href="https://ashoat.com"
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            Ashoat
          </a>{' '}
          to chat with friends and family. He wanted something with the privacy
          of Signal and the power of Slack.
        </p>

        <p className={paragraphClassName}>
          In 2020, he started fundraising for Comm. Over the next 3 years he{' '}
          <NavLink to="/supporters" exact className={linkClassName}>
            raised $7 million
          </NavLink>{' '}
          to fund its development, which allowed him to hire a{' '}
          <a
            href="https://github.com/CommE2E/comm/graphs/contributors"
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            small team
          </a>{' '}
          to build out the initial vision.
        </p>

        <p className={paragraphClassName}>
          Unfortunately, the money eventually ran out and another fundraising
          round was not in the cards. In 2026, the startup was shut down, and
          Comm moved to be under the 501(c)(3) non-profit Helio Networks.
        </p>

        <p className={paragraphClassName}>
          Ashoat continues to actively develop and support Comm today.
        </p>
      </div>
    </main>
  );
}

export default Story;
