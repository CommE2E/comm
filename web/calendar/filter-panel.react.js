// @flow

import {
  faCog,
  faTimesCircle,
  faChevronUp,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import Switch from 'react-switch';

import { useModalContext } from 'lib/components/modal-provider.react';
import {
  filteredThreadIDsSelector,
  includeDeletedSelector,
} from 'lib/selectors/calendar-filter-selectors';
import SearchIndex from 'lib/shared/search-index';
import {
  calendarThreadFilterTypes,
  type FilterThreadInfo,
  updateCalendarThreadFilter,
  clearCalendarThreadFilter,
  setCalendarDeletedFilter,
} from 'lib/types/filter-types';
import type { Dispatch } from 'lib/types/redux-types';

import ThreadSettingsModal from '../modals/threads/settings/thread-settings-modal.react';
import { useSelector } from '../redux/redux-utils';
import {
  webFilterThreadInfos,
  webFilterThreadSearchIndex,
} from '../selectors/calendar-selectors';
import { MagnifyingGlass } from '../vectors.react';
import css from './filter-panel.css';

type Props = {
  +filterThreadInfos: () => $ReadOnlyArray<FilterThreadInfo>,
  +filterThreadSearchIndex: () => SearchIndex,
  +filteredThreadIDs: ?$ReadOnlySet<string>,
  +includeDeleted: boolean,
  +dispatch: Dispatch,
  +pushModal: (modal: React.Node) => void,
};
type State = {
  +query: string,
  +searchResults: $ReadOnlyArray<FilterThreadInfo>,
  +collapsed: boolean,
};
class FilterPanel extends React.PureComponent<Props, State> {
  state: State = {
    query: '',
    searchResults: [],
    collapsed: false,
  };

  currentlySelected(threadID: string): boolean {
    if (!this.props.filteredThreadIDs) {
      return true;
    }
    return this.props.filteredThreadIDs.has(threadID);
  }

  render() {
    const filterThreadInfos = this.state.query
      ? this.state.searchResults
      : this.props.filterThreadInfos();

    let filters = [];
    if (!this.state.query || filterThreadInfos.length > 0) {
      filters.push(
        <Category
          numThreads={filterThreadInfos.length}
          onToggle={this.onToggleAll}
          collapsed={this.state.collapsed}
          onCollapse={this.onCollapse}
          selected={!this.props.filteredThreadIDs}
          key="all"
        />,
      );
    } else {
      filters.push(
        <div className={css.noResults} key="noResults">
          No results
        </div>,
      );
    }
    if (!this.state.collapsed) {
      const options = filterThreadInfos.map(filterThreadInfo => (
        <Item
          filterThreadInfo={filterThreadInfo}
          onToggle={this.onToggle}
          onClickOnly={this.onClickOnly}
          onClickSettings={this.onClickSettings}
          selected={this.currentlySelected(filterThreadInfo.threadInfo.id)}
          key={filterThreadInfo.threadInfo.id}
        />
      ));
      filters = [...filters, ...options];
    }

    let clearQueryButton = null;
    if (this.state.query) {
      clearQueryButton = (
        <a href="#" onClick={this.clearQuery}>
          <FontAwesomeIcon icon={faTimesCircle} className={css.clearQuery} />
        </a>
      );
    }

    return (
      <div className={css.container}>
        <div className={css.searchContainer}>
          <div className={css.search}>
            <MagnifyingGlass className={css.searchVector} />
            <input
              type="text"
              placeholder="Search"
              value={this.state.query}
              onChange={this.onChangeQuery}
            />
            {clearQueryButton}
          </div>
        </div>
        <div className={css.filters}>{filters}</div>
        <div className={css.extras}>
          <label htmlFor="include-deleted-switch">
            <Switch
              checked={this.props.includeDeleted}
              onChange={this.onChangeIncludeDeleted}
              checkedIcon={false}
              uncheckedIcon={false}
              height={20}
              width={40}
              id="include-deleted-switch"
            />
            <span>Include deleted entries</span>
          </label>
        </div>
      </div>
    );
  }

  onToggle = (threadID: string, value: boolean) => {
    let newThreadIDs;
    const selectedThreadIDs = this.props.filteredThreadIDs;
    if (!selectedThreadIDs && value) {
      // No thread filter exists and thread is being added
      return;
    } else if (!selectedThreadIDs) {
      // No thread filter exists and thread is being removed
      newThreadIDs = this.props
        .filterThreadInfos()
        .map(filterThreadInfo => filterThreadInfo.threadInfo.id)
        .filter(id => id !== threadID);
    } else if (selectedThreadIDs.has(threadID) && value) {
      // Thread filter already includes thread being added
      return;
    } else if (selectedThreadIDs.has(threadID)) {
      // Thread being removed from current thread filter
      newThreadIDs = [...selectedThreadIDs].filter(id => id !== threadID);
    } else if (!value) {
      // Thread filter doesn't include thread being removed
      return;
    } else if (
      selectedThreadIDs.size + 1 ===
      this.props.filterThreadInfos().length
    ) {
      // Thread filter exists and thread being added is the only one missing
      newThreadIDs = null;
    } else {
      // Thread filter exists and thread is being added
      newThreadIDs = [...selectedThreadIDs, threadID];
    }
    this.setFilterThreads(newThreadIDs);
  };

  onToggleAll = (value: boolean) => {
    this.setFilterThreads(value ? null : []);
  };

  onClickOnly = (threadID: string) => {
    this.setFilterThreads([threadID]);
  };

  setFilterThreads(threadIDs: ?$ReadOnlyArray<string>) {
    if (!threadIDs) {
      this.props.dispatch({
        type: clearCalendarThreadFilter,
      });
    } else {
      this.props.dispatch({
        type: updateCalendarThreadFilter,
        payload: {
          type: calendarThreadFilterTypes.THREAD_LIST,
          threadIDs,
        },
      });
    }
  }

  onClickSettings = (threadID: string) => {
    this.props.pushModal(<ThreadSettingsModal threadID={threadID} />);
  };

  onChangeQuery = (event: SyntheticEvent<HTMLInputElement>) => {
    const query = event.currentTarget.value;
    const searchIndex = this.props.filterThreadSearchIndex();
    const resultIDs = new Set(searchIndex.getSearchResults(query));
    const results = this.props
      .filterThreadInfos()
      .filter(filterThreadInfo =>
        resultIDs.has(filterThreadInfo.threadInfo.id),
      );
    this.setState({ query, searchResults: results, collapsed: false });
  };

  clearQuery = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.setState({ query: '', searchResults: [], collapsed: false });
  };

  onCollapse = (value: boolean) => {
    this.setState({ collapsed: value });
  };

  onChangeIncludeDeleted = (includeDeleted: boolean) => {
    this.props.dispatch({
      type: setCalendarDeletedFilter,
      payload: {
        includeDeleted,
      },
    });
  };
}

type ItemProps = {
  +filterThreadInfo: FilterThreadInfo,
  +onToggle: (threadID: string, value: boolean) => void,
  +onClickOnly: (threadID: string) => void,
  +onClickSettings: (threadID: string) => void,
  +selected: boolean,
};
class Item extends React.PureComponent<ItemProps> {
  render() {
    const threadInfo = this.props.filterThreadInfo.threadInfo;
    const beforeCheckStyles = { borderColor: `#${threadInfo.color}` };
    let afterCheck = null;
    if (this.props.selected) {
      const afterCheckStyles = { backgroundColor: `#${threadInfo.color}` };
      afterCheck = (
        <div
          className={classNames(css.optionCheckbox, css.checkboxAfterOption)}
          style={afterCheckStyles}
        />
      );
    }
    const details =
      this.props.filterThreadInfo.numVisibleEntries === 1
        ? '1 entry'
        : `${this.props.filterThreadInfo.numVisibleEntries} entries`;
    return (
      <div className={css.option}>
        <div className={css.optionThread}>
          <input
            type="checkbox"
            checked={this.props.selected}
            onChange={this.onChange}
          />
          <label>
            <div className={css.optionCheckbox} style={beforeCheckStyles} />
            {threadInfo.uiName}
            {afterCheck}
          </label>
          <a onClick={this.onClickOnly} className={css.only}>
            only
          </a>
          <a onClick={this.onClickSettings} className={css.settingsCog}>
            <FontAwesomeIcon icon={faCog} />
          </a>
        </div>
        <div className={css.optionDetails}>{details}</div>
      </div>
    );
  }

  onChange = (event: SyntheticEvent<HTMLInputElement>) => {
    this.props.onToggle(
      this.props.filterThreadInfo.threadInfo.id,
      event.currentTarget.checked,
    );
  };

  onClickOnly = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.onClickOnly(this.props.filterThreadInfo.threadInfo.id);
  };

  onClickSettings = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.onClickSettings(this.props.filterThreadInfo.threadInfo.id);
  };
}

type CategoryProps = {
  +numThreads: number,
  +onToggle: (value: boolean) => void,
  +collapsed: boolean,
  +onCollapse: (value: boolean) => void,
  +selected: boolean,
};
class Category extends React.PureComponent<CategoryProps> {
  render() {
    const beforeCheckStyles = { borderColor: 'white' };
    let afterCheck = null;
    if (this.props.selected) {
      const afterCheckStyles = { backgroundColor: 'white' };
      afterCheck = (
        <div
          className={classNames(css.optionCheckbox, css.checkboxAfterOption)}
          style={afterCheckStyles}
        />
      );
    }
    const icon = this.props.collapsed ? faChevronUp : faChevronDown;
    const details =
      this.props.numThreads === 1 ? '1 chat' : `${this.props.numThreads} chats`;
    return (
      <div className={css.category}>
        <div className={css.optionThread}>
          <input
            type="checkbox"
            checked={this.props.selected}
            onChange={this.onChange}
          />
          <label>
            <div className={css.optionCheckbox} style={beforeCheckStyles} />
            Your chats
            {afterCheck}
          </label>
          <a onClick={this.onCollapse} className={css.collapse}>
            <FontAwesomeIcon icon={icon} />
          </a>
        </div>
        <div className={css.optionDetails}>{details}</div>
      </div>
    );
  }

  onChange = (event: SyntheticEvent<HTMLInputElement>) => {
    this.props.onToggle(event.currentTarget.checked);
  };

  onCollapse = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.onCollapse(!this.props.collapsed);
  };
}

const ConnectedFilterPanel: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedFilterPanel(): React.Node {
    const filteredThreadIDs = useSelector(filteredThreadIDsSelector);
    const filterThreadInfos = useSelector(webFilterThreadInfos);
    const filterThreadSearchIndex = useSelector(webFilterThreadSearchIndex);
    const includeDeleted = useSelector(includeDeletedSelector);
    const dispatch = useDispatch();
    const modalContext = useModalContext();

    return (
      <FilterPanel
        filteredThreadIDs={filteredThreadIDs}
        filterThreadInfos={filterThreadInfos}
        filterThreadSearchIndex={filterThreadSearchIndex}
        includeDeleted={includeDeleted}
        dispatch={dispatch}
        pushModal={modalContext.pushModal}
      />
    );
  },
);

export default ConnectedFilterPanel;
