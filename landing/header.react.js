// @flow

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
    <div className={headerStyle}>
      <Link to="/">
        <h1 className={css.logo}>Comm</h1>
      </Link>
    </div>
  );
}

export default Header;
