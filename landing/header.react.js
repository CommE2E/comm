// @flow

import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Link } from 'react-router-dom';

import css from './landing.css';

export type HeaderProps = {
  +isLegalPage: boolean,
};
function Header(props: HeaderProps): React.Node {
  const { isLegalPage } = props;

  const headerStyle = isLegalPage
    ? `${css.header_grid} ${css.header_legal}`
    : css.header_grid;
  return (
    <>
      <div className={headerStyle}>
        <div className={css.logo}>
          <Link to="/">
            <h1>Comm</h1>
          </Link>
        </div>
        <div className={css.top_nav}>
          <Link to="/">
            <h1>Comm Messenger</h1>
          </Link>
          <Link to="/keyservers">
            <h1>Keyservers</h1>
          </Link>
        </div>
        <div className={css.placeholder}>
          <Link to="/">
            <FontAwesomeIcon size="lg" color="#7e57c2" icon={faEnvelope} />
          </Link>
        </div>
      </div>
    </>
  );
}

export default Header;
