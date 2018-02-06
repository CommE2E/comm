// @flow

import type { TypeaheadOptionInfo } from './typeahead.react';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import css from '../style.css';
import { LeftPager, RightPager } from '../vectors.react';

type Props = {
  paneTitle: string,
  pageSize: number,
  optionInfos: TypeaheadOptionInfo[],
  renderOption: (optionInfo: TypeaheadOptionInfo) => React.Node,
};
type State = {
  currentPage: number,
};

class TypeaheadPane extends React.PureComponent<Props, State> {

  state = {
    currentPage: 0,
  };

  static firstIndex(props: Props, page: number) {
    return props.pageSize * page;
  }

  static secondIndex(props: Props, page: number) {
    return Math.min(props.pageSize * (page + 1), props.optionInfos.length);
  }

  render() {
    const currentResults = this.props.optionInfos.slice(
      TypeaheadPane.firstIndex(this.props, this.state.currentPage),
      TypeaheadPane.secondIndex(this.props, this.state.currentPage),
    ).map(this.props.renderOption);

    let pager = null;
    if (this.props.optionInfos.length > currentResults.length) {
      let leftPager = (
        <LeftPager className={css['thread-nav-pager-svg']} />
      );
      if (this.state.currentPage > 0) {
        leftPager = (
          <a
            href="#"
            className={css['thread-nav-pager-button']}
            onClick={this.onBackPagerClick}
          >{leftPager}</a>
        );
      }
      let rightPager = (
        <RightPager className={css['thread-nav-pager-svg']} />
      );
      if (
        this.props.pageSize * (this.state.currentPage + 1)
          < this.props.optionInfos.length
      ) {
        rightPager = (
          <a
            href="#"
            className={css['thread-nav-pager-button']}
            onClick={this.onNextPagerClick}
          >{rightPager}</a>
        );
      }
      const pagerText =
        `${TypeaheadPane.firstIndex(this.props, this.state.currentPage) + 1}–` +
        `${TypeaheadPane.secondIndex(this.props, this.state.currentPage)} ` +
        `of ${this.props.optionInfos.length}`;
      pager = (
        <div className={css['thread-nav-pager']}>
          {leftPager}
          <span className={css['thread-nav-pager-status']}>
            {pagerText}
          </span>
          {rightPager}
        </div>
      );
    }
    return (
      <div className={css['thread-nav-option-pane']}>
        <div className={css['thread-nav-option-pane-header']}>
          {this.props.paneTitle}
          {pager}
        </div>
        {currentResults}
      </div>
    );
  }

  onBackPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        prevState.currentPage > 0,
        "can't go back from 0",
      );
      return {
        ...prevState,
        currentPage: prevState.currentPage - 1,
      };
    });
  }

  onNextPagerClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      return {
        ...prevState,
        currentPage: prevState.currentPage + 1,
      };
    });
  }

}

TypeaheadPane.propTypes = {
  paneTitle: PropTypes.string.isRequired,
  pageSize: PropTypes.number.isRequired,
  optionInfos: PropTypes.array.isRequired,
  renderOption: PropTypes.func.isRequired,
};

export default TypeaheadPane;
