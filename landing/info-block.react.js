// @flow

import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import css from './info-block.css';
import typography from './typography.css';

type InfoBlockProps = {
  +containerClassName: string,
  +colorHeader: boolean,
  +headerTextContent: string,
  +infoBlockContent: React.Node,
  +navLinkDestination: string,
  +linkTextContent: string,
};
function InfoBlock(props: InfoBlockProps): React.Node {
  const {
    containerClassName,
    headerTextContent,
    colorHeader,
    infoBlockContent,
    navLinkDestination,
    linkTextContent,
  } = props;

  const headerClassName = classNames([typography.heading1, css.header]);

  const linkClassName = classNames([typography.paragraph1, css.link]);

  let headerText;
  if (colorHeader) {
    const lastSpaceIndex = headerTextContent.lastIndexOf(' ');
    const remainingSentence = headerTextContent.substring(0, lastSpaceIndex);
    const lastWord = headerTextContent.substring(lastSpaceIndex + 1);

    headerText = (
      <>
        {remainingSentence}
        <span> {lastWord}</span>
      </>
    );
  } else {
    headerText = headerTextContent;
  }

  return (
    <section className={containerClassName}>
      <div className={css.textContainer}>
        <h1 className={headerClassName}>{headerText}</h1>
        {infoBlockContent}
        <NavLink to={navLinkDestination} exact className={css.linkContainer}>
          <p className={linkClassName}>{linkTextContent}</p>
          <FontAwesomeIcon
            size="sm"
            className={css.icon}
            icon={faExternalLinkAlt}
          />
        </NavLink>
      </div>
    </section>
  );
}

export default InfoBlock;
