// @flow

import {
  faAppStoreIos,
  faGooglePlay,
  faApple,
  faWindows,
} from '@fortawesome/free-brands-svg-icons';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import Button from './button.react.js';
import css from './download.css';
import typography from './typography.css';

const onClickiOS = () => {
  window.open(
    'https://apps.apple.com/us/app/comm-messenger/id1574433435',
    '_blank',
  );
};

const onClickAndroid = () => {
  window.open(
    'https://play.google.com/store/apps/details?id=app.comm.android',
    '_blank',
  );
};

const onClickMacOS = () => {
  window.open(
    'https://electron-update.commtechnologies.org/download/dmg',
    '_blank',
  );
};

const onClickWindows = () => {
  window.open(
    'https://electron-update.commtechnologies.org/download/windows',
    '_blank',
  );
};

const onClickWeb = () => {
  window.open('https://web.comm.app', '_blank');
};

function Download(): React.Node {
  const headerClassName = classNames([typography.heading1, css.heading]);
  const subheaderClassName = classNames([
    typography.subheading2,
    css.subheading,
  ]);
  const platformHeaderTextClassName = classNames([
    typography.heading4,
    css.platfromHeader,
  ]);

  return (
    <div className={css.container}>
      <h1 className={headerClassName}>Download Comm</h1>
      <h2 className={subheaderClassName}>
        Note that account creation is only possible on mobile.
      </h2>
      <p className={platformHeaderTextClassName}>Mobile</p>
      <div className={css.buttonsContainer}>
        <Button onClick={onClickiOS}>
          <div className={css.buttonContentContainer}>
            <FontAwesomeIcon icon={faAppStoreIos} size="lg" />
            <div className={typography.paragraph1}>iOS</div>
          </div>
        </Button>
        <Button onClick={onClickAndroid}>
          <div className={css.buttonContentContainer}>
            <FontAwesomeIcon icon={faGooglePlay} size="lg" />
            <div className={typography.paragraph1}>Android</div>
          </div>
        </Button>
      </div>
      <p className={platformHeaderTextClassName}>Desktop</p>
      <div className={css.buttonsContainer}>
        <Button onClick={onClickMacOS}>
          <div className={css.buttonContentContainer}>
            <FontAwesomeIcon icon={faApple} size="lg" />
            <div className={typography.paragraph1}>macOS</div>
          </div>
        </Button>
        <Button onClick={onClickWindows}>
          <div className={css.buttonContentContainer}>
            <FontAwesomeIcon icon={faWindows} size="lg" />
            <div className={typography.paragraph1}>Windows</div>
          </div>
        </Button>
        <Button onClick={onClickWeb}>
          <div className={css.buttonContentContainer}>
            <FontAwesomeIcon icon={faGlobe} size="lg" />
            <div className={typography.paragraph1}>Web</div>
          </div>
        </Button>
      </div>
    </div>
  );
}

export default Download;
