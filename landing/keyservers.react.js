// @flow

import { create } from '@lottiefiles/lottie-interactivity';
import classNames from 'classnames';
import * as React from 'react';

import { useIsomorphicLayoutEffect } from 'lib/hooks/isomorphic-layout-effect.react.js';

import { assetsCacheURLPrefix } from './asset-meta-data.js';
import KeyserverFAQ from './keyserver-faq.react.js';
import css from './keyservers.css';
import ReadDocsButton from './read-docs-btn.react.js';
import RequestAccess from './request-access.react.js';
import typography from './typography.css';

function Keyservers(): React.Node {
  React.useEffect(() => {
    import('@lottiefiles/lottie-player');
  }, []);

  const onEyeIllustrationLoad = React.useCallback(() => {
    create({
      mode: 'scroll',
      player: '#eye-illustration',
      actions: [
        {
          visibility: [0, 1],
          type: 'seek',
          frames: [0, 720],
        },
      ],
    });
  }, []);

  const onCloudIllustrationLoad = React.useCallback(() => {
    create({
      mode: 'scroll',
      player: '#cloud-illustration',
      actions: [
        {
          visibility: [0, 0.2],
          type: 'stop',
          frames: [0],
        },
        {
          visibility: [0.2, 1],
          type: 'seek',
          frames: [0, 300],
        },
      ],
    });
  }, []);

  const [eyeNode, setEyeNode] = React.useState(null);
  useIsomorphicLayoutEffect(() => {
    if (!eyeNode) {
      return undefined;
    }
    eyeNode.addEventListener('load', onEyeIllustrationLoad);
    return () => eyeNode.removeEventListener('load', onEyeIllustrationLoad);
  }, [eyeNode, onEyeIllustrationLoad]);

  const [cloudNode, setCloudNode] = React.useState(null);
  useIsomorphicLayoutEffect(() => {
    if (!cloudNode) {
      return undefined;
    }
    cloudNode.addEventListener('load', onCloudIllustrationLoad);
    return () => cloudNode.removeEventListener('load', onCloudIllustrationLoad);
  }, [cloudNode, onCloudIllustrationLoad]);

  const headingClassName = classNames([typography.heading1, css.heading]);
  const descriptionClassName = classNames([
    typography.subheading2,
    css.description,
  ]);

  return (
    <main>
      <div className={css.body_grid}>
        <div className={`${css.hero_image} ${css.starting_section}`}>
          <lottie-player
            id="eye-illustration"
            ref={setEyeNode}
            mode="normal"
            src={`${assetsCacheURLPrefix}/animated_eye.json`}
            speed={1}
          />
        </div>
        <div className={`${css.hero_copy} ${css.section}`}>
          <h1 className={css.mono}>
            Reclaim your
            <span className={css.purple_accent}> digital&nbsp;identity.</span>
          </h1>
          <p>
            The Internet is broken today. Private user data is owned by
            mega-corporations and farmed for their benefit.
          </p>
          <p>
            E2E encryption has the potential to change this equation. But
            it&rsquo;s constrained by a crucial limitation.
          </p>
        </div>

        <div className={`${css.server_image} ${css.starting_section}`}>
          <lottie-player
            id="cloud-illustration"
            ref={setCloudNode}
            mode="normal"
            src={`${assetsCacheURLPrefix}/animated_cloud.json`}
            speed={1}
          />
        </div>
        <div className={`${css.server_copy} ${css.section}`}>
          <h1 className={css.mono}>Apps need servers.</h1>
          <p>
            Sophisticated applications rely on servers to do things that your
            devices simply can&rsquo;t.
          </p>
          <p>
            That&rsquo;s why E2E encryption only works for simple chat apps
            today. There&rsquo;s no way to build a robust server layer that has
            access to your data without leaking that data to corporations.
          </p>
        </div>
      </div>

      <section className={css.keyserver_company_section}>
        <div className={css.keyserver_company_container}>
          <div className={css.keyserver_company_copy}>
            <h1 className={headingClassName}>
              Comm is the
              <span className={css.purple_gradient}> keyserver </span>
              company.
            </h1>
            <p className={descriptionClassName}>
              In the future, people have their own servers.
            </p>
            <p className={descriptionClassName}>
              Your keyserver is the home of your digital identity. It owns your
              private keys and your personal data. It&rsquo;s your password
              manager, your crypto bank, your digital surrogate, and your second
              brain.
            </p>
          </div>
          <div className={css.read_the_docs}>
            <ReadDocsButton />
          </div>
        </div>
      </section>
      <KeyserverFAQ />
      <RequestAccess />
    </main>
  );
}

export default Keyservers;
