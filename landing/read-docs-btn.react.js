// @flow

import * as React from 'react';

import css from './read-docs-btn.css';

function ReadDocsButton(): React.Node {
  return (
    <a href="https://www.notion.so/Comm-4ec7bbc1398442ce9add1d7953a6c584">
      <button className={css.button}>
        Read the documentation
        <span className={css.cornerIcon}>
          <img src="images/corner_arrow.svg"></img>
        </span>
      </button>
    </a>
  );
}
export default ReadDocsButton;
