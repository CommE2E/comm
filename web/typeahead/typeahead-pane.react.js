// @flow

import React from 'react';
import invariant from 'invariant';

import css from '../style.css';
import { LeftPager, RightPager } from '../vectors.react';

type Props = {
  paneTitle: string,
  pageSize: number,
  totalResults: number,
  resultsBetween: (start: number, end: number) => React.Element<any>[],
};
type State = {
  currentPage: number,
  currentResults: React.Element<any>[],
};

class TypeaheadPane extends React.PureComponent {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPage: 0,
      currentResults: props.resultsBetween(
        this.firstIndex(props, 0),
        this.secondIndex(props, 0),
      ),
    };
    invariant(
      this.state.currentResults.length <= props.pageSize,
      "results larger than page size",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    // This is a bit hacky, since it's possible for the responses of
    // resultsBetween to change for the range comprising our current page,
    // without us being informed about it by a change in these values
    if (
      this.props.totalResults !== nextProps.totalResults ||
      this.props.resultsBetween !== nextProps.resultsBetween
    ) {
      this.setState((prevState, props) => ({
        ...prevState,
        currentResults: props.resultsBetween(
          this.firstIndex(props, prevState.currentPage),
          this.secondIndex(props, prevState.currentPage),
        ),
      }));
    }
  }

  firstIndex(props: Props, page: number) {
    return props.pageSize * page;
  }

  secondIndex(props: Props, page: number) {
    return Math.min(props.pageSize * (page + 1), props.totalResults);
  }

  render() {
    if (this.props.totalResults === 0) {
      return null;
    }
    let pager = null;
    if (this.props.totalResults > this.state.currentResults.length) {
      let leftPager = (
        <LeftPager className={css['calendar-nav-pager-svg']} />
      );
      if (this.state.currentPage > 0) {
        leftPager = (
          <a
            href="#"
            className={css['calendar-nav-pager-button']}
            onClick={this.onBackPagerClick}
          >{leftPager}</a>
        );
      }
      let rightPager = (
        <RightPager className={css['calendar-nav-pager-svg']} />
      );
      if (
        this.props.pageSize * (this.state.currentPage + 1)
          < this.props.totalResults
      ) {
        rightPager = (
          <a
            href="#"
            className={css['calendar-nav-pager-button']}
            onClick={this.onNextPagerClick}
          >{rightPager}</a>
        );
      }
      pager = (
        <div className={css['calendar-nav-pager']}>
          {leftPager}
          <span className={css['calendar-nav-pager-status']}>
            {
              `${this.firstIndex(this.props, this.state.currentPage) + 1}–` +
              `${this.secondIndex(this.props, this.state.currentPage)} ` +
              `of ${this.props.totalResults}`
            }
          </span>
          {rightPager}
        </div>
      );
    }
    return (
      <div className={css['calendar-nav-option-pane']}>
        <div className={css['calendar-nav-option-pane-header']}>
          {this.props.paneTitle}
          {pager}
        </div>
        {this.state.currentResults}
      </div>
    );
  }

  onBackPagerClick = (event: SyntheticEvent) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        prevState.currentPage > 0,
        "can't go back from 0",
      );
      const newPage = prevState.currentPage - 1;
      const newResults = props.resultsBetween(
        this.firstIndex(this.props, newPage),
        this.secondIndex(this.props, newPage),
      );
      invariant(
        newResults.length <= props.pageSize,
        "results larger than page size",
      );
      return {
        ...prevState,
        currentPage: newPage,
        currentResults: newResults,
      };
    });
  }

  onNextPagerClick = (event: SyntheticEvent) => {
    event.preventDefault();
    this.setState((prevState, props) => {
      invariant(
        props.pageSize * (prevState.currentPage + 1) < props.totalResults,
        "page is too high",
      );
      const newPage = prevState.currentPage + 1;
      const newResults = props.resultsBetween(
        this.firstIndex(this.props, newPage),
        this.secondIndex(this.props, newPage),
      );
      invariant(
        newResults.length <= props.pageSize,
        "results larger than page size",
      );
      return {
        ...prevState,
        currentPage: newPage,
        currentResults: newResults,
      };
    });
  }

}

TypeaheadPane.propTypes = {
  paneTitle: React.PropTypes.string.isRequired,
  pageSize: React.PropTypes.number.isRequired,
  totalResults: React.PropTypes.number.isRequired,
  resultsBetween: React.PropTypes.func.isRequired,
};

export default TypeaheadPane;
