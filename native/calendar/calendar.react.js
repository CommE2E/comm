// @flow

import invariant from 'invariant';
import _filter from 'lodash/fp/filter.js';
import _find from 'lodash/fp/find.js';
import _findIndex from 'lodash/fp/findIndex.js';
import _map from 'lodash/fp/map.js';
import _pickBy from 'lodash/fp/pickBy.js';
import _size from 'lodash/fp/size.js';
import _sum from 'lodash/fp/sum.js';
import _throttle from 'lodash/throttle.js';
import * as React from 'react';
import {
  View,
  Text,
  FlatList,
  AppState as NativeAppState,
  Platform,
  LayoutAnimation,
  TouchableWithoutFeedback,
} from 'react-native';

import {
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
} from 'lib/actions/entry-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { entryKey } from 'lib/shared/entry-utils.js';
import type {
  EntryInfo,
  CalendarQuery,
  CalendarQueryUpdateResult,
} from 'lib/types/entry-types.js';
import type { CalendarFilter } from 'lib/types/filter-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ConnectionStatus } from 'lib/types/socket-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils.js';
import {
  dateString,
  prettyDate,
  dateFromString,
} from 'lib/utils/date-utils.js';
import sleep from 'lib/utils/sleep.js';

import CalendarInputBar from './calendar-input-bar.react.js';
import {
  Entry,
  InternalEntry,
  dummyNodeForEntryHeightMeasurement,
} from './entry.react.js';
import SectionFooter from './section-footer.react.js';
import ContentLoading from '../components/content-loading.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import ListLoadingIndicator from '../components/list-loading-indicator.react.js';
import NodeHeightMeasurer from '../components/node-height-measurer.react.js';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard.js';
import DisconnectedBar from '../navigation/disconnected-bar.react.js';
import {
  createIsForegroundSelector,
  createActiveTabSelector,
} from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import {
  CalendarRouteName,
  ThreadPickerModalRouteName,
} from '../navigation/route-names.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { calendarListData } from '../selectors/calendar-selectors.js';
import type {
  CalendarItem,
  SectionHeaderItem,
  SectionFooterItem,
  LoaderItem,
} from '../selectors/calendar-selectors.js';
import {
  type DerivedDimensionsInfo,
  derivedDimensionsInfoSelector,
} from '../selectors/dimensions-selectors.js';
import {
  useColors,
  useStyles,
  useIndicatorStyle,
  type Colors,
  type IndicatorStyle,
} from '../themes/colors.js';
import type {
  EventSubscription,
  ScrollEvent,
  ViewableItemsChange,
  KeyboardEvent,
} from '../types/react-native.js';

export type EntryInfoWithHeight = {
  ...EntryInfo,
  +textHeight: number,
};
type CalendarItemWithHeight =
  | LoaderItem
  | SectionHeaderItem
  | SectionFooterItem
  | {
      itemType: 'entryInfo',
      entryInfo: EntryInfoWithHeight,
      threadInfo: ThreadInfo,
    };
type ExtraData = {
  +activeEntries: { +[key: string]: boolean },
  +visibleEntries: { +[key: string]: boolean },
};

type BaseProps = {
  +navigation: TabNavigationProp<'Calendar'>,
  +route: NavigationRoute<'Calendar'>,
};
type Props = {
  ...BaseProps,
  // Nav state
  +calendarActive: boolean,
  // Redux state
  +listData: ?$ReadOnlyArray<CalendarItem>,
  +startDate: string,
  +endDate: string,
  +calendarFilters: $ReadOnlyArray<CalendarFilter>,
  +dimensions: DerivedDimensionsInfo,
  +loadingStatus: LoadingStatus,
  +connectionStatus: ConnectionStatus,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +updateCalendarQuery: (
    calendarQuery: CalendarQuery,
    reduxAlreadyUpdated?: boolean,
  ) => Promise<CalendarQueryUpdateResult>,
};
type State = {
  +listDataWithHeights: ?$ReadOnlyArray<CalendarItemWithHeight>,
  +readyToShowList: boolean,
  +extraData: ExtraData,
  +currentlyEditing: $ReadOnlyArray<string>,
};
class Calendar extends React.PureComponent<Props, State> {
  flatList: ?FlatList<CalendarItemWithHeight> = null;
  currentState: ?string = NativeAppState.currentState;
  appStateListener: ?EventSubscription;
  lastForegrounded = 0;
  lastCalendarReset = 0;
  currentScrollPosition: ?number = null;
  // We don't always want an extraData update to trigger a state update, so we
  // cache the most recent value as a member here
  latestExtraData: ExtraData;
  // For some reason, we have to delay the scrollToToday call after the first
  // scroll upwards
  firstScrollComplete = false;
  // When an entry becomes active, we make a note of its key so that once the
  // keyboard event happens, we know where to move the scrollPos to
  lastEntryKeyActive: ?string = null;
  keyboardShowListener: ?EventSubscription;
  keyboardDismissListener: ?EventSubscription;
  keyboardShownHeight: ?number = null;
  // If the query fails, we try it again
  topLoadingFromScroll: ?CalendarQuery = null;
  bottomLoadingFromScroll: ?CalendarQuery = null;
  // We wait until the loaders leave view before letting them be triggered again
  topLoaderWaitingToLeaveView = true;
  bottomLoaderWaitingToLeaveView = true;
  // We keep refs to the entries so CalendarInputBar can save them
  entryRefs = new Map();

  constructor(props: Props) {
    super(props);
    this.latestExtraData = {
      activeEntries: {},
      visibleEntries: {},
    };
    this.state = {
      listDataWithHeights: null,
      readyToShowList: false,
      extraData: this.latestExtraData,
      currentlyEditing: [],
    };
  }

  componentDidMount() {
    this.appStateListener = NativeAppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardShow);
    this.keyboardDismissListener = addKeyboardDismissListener(
      this.keyboardDismiss,
    );
    this.props.navigation.addListener('tabPress', this.onTabPress);
  }

  componentWillUnmount() {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    if (this.keyboardShowListener) {
      removeKeyboardListener(this.keyboardShowListener);
      this.keyboardShowListener = null;
    }
    if (this.keyboardDismissListener) {
      removeKeyboardListener(this.keyboardDismissListener);
      this.keyboardDismissListener = null;
    }
    this.props.navigation.removeListener('tabPress', this.onTabPress);
  }

  handleAppStateChange = (nextAppState: ?string) => {
    const lastState = this.currentState;
    this.currentState = nextAppState;
    if (
      !lastState ||
      !lastState.match(/inactive|background/) ||
      this.currentState !== 'active'
    ) {
      // We're only handling foregrounding here
      return;
    }
    if (Date.now() - this.lastCalendarReset < 500) {
      // If the calendar got reset right before this callback triggered, that
      // indicates we should reset the scroll position
      this.lastCalendarReset = 0;
      this.scrollToToday(false);
    } else {
      // Otherwise, it's possible that the calendar is about to get reset. We
      // record a timestamp here so we can scrollToToday there.
      this.lastForegrounded = Date.now();
    }
  };

  onTabPress = () => {
    if (this.props.navigation.isFocused()) {
      this.scrollToToday();
    }
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!this.props.listData && this.props.listData !== prevProps.listData) {
      this.latestExtraData = {
        activeEntries: {},
        visibleEntries: {},
      };
      this.setState({
        listDataWithHeights: null,
        readyToShowList: false,
        extraData: this.latestExtraData,
      });
      this.firstScrollComplete = false;
      this.topLoaderWaitingToLeaveView = true;
      this.bottomLoaderWaitingToLeaveView = true;
    }

    const { loadingStatus, connectionStatus } = this.props;
    const {
      loadingStatus: prevLoadingStatus,
      connectionStatus: prevConnectionStatus,
    } = prevProps;
    if (
      (loadingStatus === 'error' && prevLoadingStatus === 'loading') ||
      (connectionStatus === 'connected' && prevConnectionStatus !== 'connected')
    ) {
      this.loadMoreAbove();
      this.loadMoreBelow();
    }

    const lastLDWH = prevState.listDataWithHeights;
    const newLDWH = this.state.listDataWithHeights;
    if (!newLDWH) {
      return;
    } else if (!lastLDWH) {
      if (!this.props.calendarActive) {
        // FlatList has an initialScrollIndex prop, which is usually close to
        // centering but can be off when there is a particularly large Entry in
        // the list. scrollToToday lets us actually center, but gets overriden
        // by initialScrollIndex if we call it right after the FlatList mounts
        sleep(50).then(() => this.scrollToToday());
      }
      return;
    }

    if (newLDWH.length < lastLDWH.length) {
      this.topLoaderWaitingToLeaveView = true;
      this.bottomLoaderWaitingToLeaveView = true;
      if (this.flatList) {
        if (!this.props.calendarActive) {
          // If the currentCalendarQuery gets reset we scroll to the center
          this.scrollToToday();
        } else if (Date.now() - this.lastForegrounded < 500) {
          // If the app got foregrounded right before the calendar got reset,
          // that indicates we should reset the scroll position
          this.lastForegrounded = 0;
          this.scrollToToday(false);
        } else {
          // Otherwise, it's possible that we got triggered before the
          // foreground callback. Let's record a timestamp here so we can call
          // scrollToToday there
          this.lastCalendarReset = Date.now();
        }
      }
    }

    const { lastStartDate, newStartDate, lastEndDate, newEndDate } =
      Calendar.datesFromListData(lastLDWH, newLDWH);

    if (newStartDate > lastStartDate || newEndDate < lastEndDate) {
      // If there are fewer items in our new data, which happens when the
      // current calendar query gets reset due to inactivity, let's reset the
      // scroll position to the center (today)
      if (!this.props.calendarActive) {
        sleep(50).then(() => this.scrollToToday());
      }
      this.firstScrollComplete = false;
    } else if (newStartDate < lastStartDate) {
      this.updateScrollPositionAfterPrepend(lastLDWH, newLDWH);
    } else if (newEndDate > lastEndDate) {
      this.firstScrollComplete = true;
    } else if (newLDWH.length > lastLDWH.length) {
      LayoutAnimation.easeInEaseOut();
    }

    if (newStartDate < lastStartDate) {
      this.topLoadingFromScroll = null;
    }
    if (newEndDate > lastEndDate) {
      this.bottomLoadingFromScroll = null;
    }

    const { keyboardShownHeight, lastEntryKeyActive } = this;
    if (keyboardShownHeight && lastEntryKeyActive) {
      this.scrollToKey(lastEntryKeyActive, keyboardShownHeight);
      this.lastEntryKeyActive = null;
    }
  }

  static datesFromListData(
    lastLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
    newLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
  ) {
    const lastSecondItem = lastLDWH[1];
    const newSecondItem = newLDWH[1];
    invariant(
      newSecondItem.itemType === 'header' &&
        lastSecondItem.itemType === 'header',
      'second item in listData should be a header',
    );
    const lastStartDate = dateFromString(lastSecondItem.dateString);
    const newStartDate = dateFromString(newSecondItem.dateString);

    const lastPenultimateItem = lastLDWH[lastLDWH.length - 2];
    const newPenultimateItem = newLDWH[newLDWH.length - 2];
    invariant(
      newPenultimateItem.itemType === 'footer' &&
        lastPenultimateItem.itemType === 'footer',
      'penultimate item in listData should be a footer',
    );
    const lastEndDate = dateFromString(lastPenultimateItem.dateString);
    const newEndDate = dateFromString(newPenultimateItem.dateString);

    return { lastStartDate, newStartDate, lastEndDate, newEndDate };
  }

  /**
   * When prepending list items, FlatList isn't smart about preserving scroll
   * position. If we're at the start of the list before prepending, FlatList
   * will just keep us at the front after prepending. But we want to preserve
   * the previous on-screen items, so we have to do a calculation to get the new
   * scroll position. (And deal with the inherent glitchiness of trying to time
   * that change with the items getting prepended... *sigh*.)
   */
  updateScrollPositionAfterPrepend(
    lastLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
    newLDWH: $ReadOnlyArray<CalendarItemWithHeight>,
  ) {
    const existingKeys = new Set(_map(Calendar.keyExtractor)(lastLDWH));
    const newItems = _filter(
      (item: CalendarItemWithHeight) =>
        !existingKeys.has(Calendar.keyExtractor(item)),
    )(newLDWH);
    const heightOfNewItems = Calendar.heightOfItems(newItems);
    const flatList = this.flatList;
    invariant(flatList, 'flatList should be set');
    const scrollAction = () => {
      invariant(
        this.currentScrollPosition !== undefined &&
          this.currentScrollPosition !== null,
        'currentScrollPosition should be set',
      );
      const currentScrollPosition = Math.max(this.currentScrollPosition, 0);
      const offset = currentScrollPosition + heightOfNewItems;
      flatList.scrollToOffset({
        offset,
        animated: false,
      });
    };
    scrollAction();
    if (!this.firstScrollComplete) {
      setTimeout(scrollAction, 0);
      this.firstScrollComplete = true;
    }
  }

  scrollToToday(animated: ?boolean = undefined) {
    if (animated === undefined) {
      animated = this.props.calendarActive;
    }
    const ldwh = this.state.listDataWithHeights;
    if (!ldwh) {
      return;
    }
    const todayIndex = _findIndex(['dateString', dateString(new Date())])(ldwh);
    invariant(this.flatList, "scrollToToday called, but flatList isn't set");
    this.flatList.scrollToIndex({
      index: todayIndex,
      animated,
      viewPosition: 0.5,
    });
  }

  renderItem = (row: { item: CalendarItemWithHeight, ... }) => {
    const item = row.item;
    if (item.itemType === 'loader') {
      return <ListLoadingIndicator />;
    } else if (item.itemType === 'header') {
      return this.renderSectionHeader(item);
    } else if (item.itemType === 'entryInfo') {
      const key = entryKey(item.entryInfo);
      return (
        <Entry
          navigation={this.props.navigation}
          entryInfo={item.entryInfo}
          threadInfo={item.threadInfo}
          active={!!this.state.extraData.activeEntries[key]}
          visible={!!this.state.extraData.visibleEntries[key]}
          makeActive={this.makeActive}
          onEnterEditMode={this.onEnterEntryEditMode}
          onConcludeEditMode={this.onConcludeEntryEditMode}
          onPressWhitespace={this.makeAllEntriesInactive}
          entryRef={this.entryRef}
        />
      );
    } else if (item.itemType === 'footer') {
      return this.renderSectionFooter(item);
    }
    invariant(false, 'renderItem conditions should be exhaustive');
  };

  renderSectionHeader = (item: SectionHeaderItem) => {
    let date = prettyDate(item.dateString);
    if (dateString(new Date()) === item.dateString) {
      date += ' (today)';
    }
    const dateObj = dateFromString(item.dateString).getDay();
    const weekendStyle =
      dateObj === 0 || dateObj === 6
        ? this.props.styles.weekendSectionHeader
        : null;
    return (
      <TouchableWithoutFeedback onPress={this.makeAllEntriesInactive}>
        <View style={[this.props.styles.sectionHeader, weekendStyle]}>
          <Text style={this.props.styles.sectionHeaderText}>{date}</Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  renderSectionFooter = (item: SectionFooterItem) => {
    return (
      <SectionFooter
        dateString={item.dateString}
        onAdd={this.onAdd}
        onPressWhitespace={this.makeAllEntriesInactive}
      />
    );
  };

  onAdd = (dayString: string) => {
    this.props.navigation.navigate(ThreadPickerModalRouteName, {
      presentedFrom: this.props.route.key,
      dateString: dayString,
    });
  };

  static keyExtractor = (item: CalendarItemWithHeight | CalendarItem) => {
    if (item.itemType === 'loader') {
      return item.key;
    } else if (item.itemType === 'header') {
      return item.dateString + '/header';
    } else if (item.itemType === 'entryInfo') {
      return entryKey(item.entryInfo);
    } else if (item.itemType === 'footer') {
      return item.dateString + '/footer';
    }
    invariant(false, 'keyExtractor conditions should be exhaustive');
  };

  static getItemLayout = (
    data: ?$ReadOnlyArray<CalendarItemWithHeight>,
    index: number,
  ) => {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = Calendar.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? Calendar.itemHeight(item) : 0;
    return { length, offset, index };
  };

  static itemHeight = (item: CalendarItemWithHeight) => {
    if (item.itemType === 'loader') {
      return 56;
    } else if (item.itemType === 'header') {
      return 31;
    } else if (item.itemType === 'entryInfo') {
      const verticalPadding = 10;
      return verticalPadding + item.entryInfo.textHeight;
    } else if (item.itemType === 'footer') {
      return 40;
    }
    invariant(false, 'itemHeight conditions should be exhaustive');
  };

  static heightOfItems = (data: $ReadOnlyArray<CalendarItemWithHeight>) => {
    return _sum(data.map(Calendar.itemHeight));
  };

  render() {
    const { listDataWithHeights } = this.state;
    let flatList = null;
    if (listDataWithHeights) {
      const flatListStyle = { opacity: this.state.readyToShowList ? 1 : 0 };
      const initialScrollIndex = this.initialScrollIndex(listDataWithHeights);
      flatList = (
        <FlatList
          data={listDataWithHeights}
          renderItem={this.renderItem}
          keyExtractor={Calendar.keyExtractor}
          getItemLayout={Calendar.getItemLayout}
          onViewableItemsChanged={this.onViewableItemsChanged}
          onScroll={this.onScroll}
          initialScrollIndex={initialScrollIndex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          onScrollEndDrag={this.onScrollEndDrag}
          scrollsToTop={false}
          extraData={this.state.extraData}
          style={[this.props.styles.flatList, flatListStyle]}
          indicatorStyle={this.props.indicatorStyle}
          ref={this.flatListRef}
        />
      );
    }
    let loadingIndicator = null;
    if (!listDataWithHeights || !this.state.readyToShowList) {
      loadingIndicator = (
        <ContentLoading fillType="absolute" colors={this.props.colors} />
      );
    }
    const disableInputBar = this.state.currentlyEditing.length === 0;
    return (
      <>
        <NodeHeightMeasurer
          listData={this.props.listData}
          itemToID={Calendar.keyExtractor}
          itemToMeasureKey={this.heightMeasurerKey}
          itemToDummy={this.heightMeasurerDummy}
          mergeItemWithHeight={this.heightMeasurerMergeItem}
          allHeightsMeasured={this.allHeightsMeasured}
        />
        <View style={this.props.styles.container}>
          <DisconnectedBar visible={this.props.calendarActive} />
          {loadingIndicator}
          {flatList}
        </View>
        <KeyboardAvoidingView
          behavior="position"
          style={this.props.styles.keyboardAvoidingViewContainer}
          contentContainerStyle={this.props.styles.keyboardAvoidingView}
          pointerEvents="box-none"
        >
          <CalendarInputBar
            onSave={this.onSaveEntry}
            disabled={disableInputBar}
          />
        </KeyboardAvoidingView>
      </>
    );
  }

  flatListHeight() {
    const { safeAreaHeight, tabBarHeight } = this.props.dimensions;
    return safeAreaHeight - tabBarHeight;
  }

  initialScrollIndex(data: $ReadOnlyArray<CalendarItemWithHeight>) {
    const todayIndex = _findIndex(['dateString', dateString(new Date())])(data);
    const heightOfTodayHeader = Calendar.itemHeight(data[todayIndex]);

    let returnIndex = todayIndex;
    let heightLeft = (this.flatListHeight() - heightOfTodayHeader) / 2;
    while (heightLeft > 0) {
      heightLeft -= Calendar.itemHeight(data[--returnIndex]);
    }
    return returnIndex;
  }

  flatListRef = (flatList: ?FlatList<CalendarItemWithHeight>) => {
    this.flatList = flatList;
  };

  entryRef = (inEntryKey: string, entry: ?InternalEntry) => {
    this.entryRefs.set(inEntryKey, entry);
  };

  makeAllEntriesInactive = () => {
    if (_size(this.state.extraData.activeEntries) === 0) {
      if (_size(this.latestExtraData.activeEntries) !== 0) {
        this.latestExtraData = {
          visibleEntries: this.latestExtraData.visibleEntries,
          activeEntries: this.state.extraData.activeEntries,
        };
      }
      return;
    }
    this.latestExtraData = {
      visibleEntries: this.latestExtraData.visibleEntries,
      activeEntries: {},
    };
    this.setState({ extraData: this.latestExtraData });
  };

  makeActive = (key: string, active: boolean) => {
    if (!active) {
      const activeKeys = Object.keys(this.latestExtraData.activeEntries);
      if (activeKeys.length === 0) {
        if (Object.keys(this.state.extraData.activeEntries).length !== 0) {
          this.setState({ extraData: this.latestExtraData });
        }
        return;
      }
      const activeKey = activeKeys[0];
      if (activeKey === key) {
        this.latestExtraData = {
          visibleEntries: this.latestExtraData.visibleEntries,
          activeEntries: {},
        };
        this.setState({ extraData: this.latestExtraData });
      }
      return;
    }

    if (
      _size(this.state.extraData.activeEntries) === 1 &&
      this.state.extraData.activeEntries[key]
    ) {
      if (
        _size(this.latestExtraData.activeEntries) !== 1 ||
        !this.latestExtraData.activeEntries[key]
      ) {
        this.latestExtraData = {
          visibleEntries: this.latestExtraData.visibleEntries,
          activeEntries: this.state.extraData.activeEntries,
        };
      }
      return;
    }
    this.latestExtraData = {
      visibleEntries: this.latestExtraData.visibleEntries,
      activeEntries: { [key]: true },
    };
    this.setState({ extraData: this.latestExtraData });
  };

  onEnterEntryEditMode = (entryInfo: EntryInfoWithHeight) => {
    const key = entryKey(entryInfo);
    const keyboardShownHeight = this.keyboardShownHeight;
    if (keyboardShownHeight && this.state.listDataWithHeights) {
      this.scrollToKey(key, keyboardShownHeight);
    } else {
      this.lastEntryKeyActive = key;
    }
    const newCurrentlyEditing = [
      ...new Set([...this.state.currentlyEditing, key]),
    ];
    if (newCurrentlyEditing.length > this.state.currentlyEditing.length) {
      this.setState({ currentlyEditing: newCurrentlyEditing });
    }
  };

  onConcludeEntryEditMode = (entryInfo: EntryInfoWithHeight) => {
    const key = entryKey(entryInfo);
    const newCurrentlyEditing = this.state.currentlyEditing.filter(
      k => k !== key,
    );
    if (newCurrentlyEditing.length < this.state.currentlyEditing.length) {
      this.setState({ currentlyEditing: newCurrentlyEditing });
    }
  };

  keyboardShow = (event: KeyboardEvent) => {
    // flatListHeight() factors in the size of the tab bar,
    // but it is hidden by the keyboard since it is at the bottom
    const { bottomInset, tabBarHeight } = this.props.dimensions;
    const inputBarHeight = Platform.OS === 'android' ? 37.7 : 35.5;
    const keyboardHeight = Platform.select({
      // Android doesn't include the bottomInset in this height measurement
      android: event.endCoordinates.height,
      default: Math.max(event.endCoordinates.height - bottomInset, 0),
    });
    const keyboardShownHeight =
      inputBarHeight + Math.max(keyboardHeight - tabBarHeight, 0);
    this.keyboardShownHeight = keyboardShownHeight;

    const lastEntryKeyActive = this.lastEntryKeyActive;
    if (lastEntryKeyActive && this.state.listDataWithHeights) {
      this.scrollToKey(lastEntryKeyActive, keyboardShownHeight);
      this.lastEntryKeyActive = null;
    }
  };

  keyboardDismiss = () => {
    this.keyboardShownHeight = null;
  };

  scrollToKey(lastEntryKeyActive: string, keyboardHeight: number) {
    const data = this.state.listDataWithHeights;
    invariant(data, 'should be set');
    const index = data.findIndex(
      (item: CalendarItemWithHeight) =>
        Calendar.keyExtractor(item) === lastEntryKeyActive,
    );
    if (index === -1) {
      return;
    }
    const itemStart = Calendar.heightOfItems(data.filter((_, i) => i < index));
    const itemHeight = Calendar.itemHeight(data[index]);
    const entryAdditionalActiveHeight = Platform.OS === 'android' ? 21 : 20;
    const itemEnd = itemStart + itemHeight + entryAdditionalActiveHeight;
    const visibleHeight = this.flatListHeight() - keyboardHeight;
    if (
      this.currentScrollPosition !== undefined &&
      this.currentScrollPosition !== null &&
      itemStart > this.currentScrollPosition &&
      itemEnd < this.currentScrollPosition + visibleHeight
    ) {
      return;
    }
    const offset = itemStart - (visibleHeight - itemHeight) / 2;
    invariant(this.flatList, 'flatList should be set');
    this.flatList.scrollToOffset({ offset, animated: true });
  }

  heightMeasurerKey = (item: CalendarItem) => {
    if (item.itemType !== 'entryInfo') {
      return null;
    }
    return item.entryInfo.text;
  };

  heightMeasurerDummy = (item: CalendarItem) => {
    invariant(
      item.itemType === 'entryInfo',
      'NodeHeightMeasurer asked for dummy for non-entryInfo item',
    );
    return dummyNodeForEntryHeightMeasurement(item.entryInfo.text);
  };

  heightMeasurerMergeItem = (item: CalendarItem, height: ?number) => {
    if (item.itemType !== 'entryInfo') {
      return item;
    }
    invariant(height !== null && height !== undefined, 'height should be set');
    const { entryInfo } = item;
    return {
      itemType: 'entryInfo',
      entryInfo: Calendar.entryInfoWithHeight(entryInfo, height),
      threadInfo: item.threadInfo,
    };
  };

  static entryInfoWithHeight(
    entryInfo: EntryInfo,
    textHeight: number,
  ): EntryInfoWithHeight {
    // Blame Flow for not accepting object spread on exact types
    if (entryInfo.id && entryInfo.localID) {
      return {
        id: entryInfo.id,
        localID: entryInfo.localID,
        threadID: entryInfo.threadID,
        text: entryInfo.text,
        year: entryInfo.year,
        month: entryInfo.month,
        day: entryInfo.day,
        creationTime: entryInfo.creationTime,
        creator: entryInfo.creator,
        deleted: entryInfo.deleted,
        textHeight: Math.ceil(textHeight),
      };
    } else if (entryInfo.id) {
      return {
        id: entryInfo.id,
        threadID: entryInfo.threadID,
        text: entryInfo.text,
        year: entryInfo.year,
        month: entryInfo.month,
        day: entryInfo.day,
        creationTime: entryInfo.creationTime,
        creator: entryInfo.creator,
        deleted: entryInfo.deleted,
        textHeight: Math.ceil(textHeight),
      };
    } else {
      return {
        localID: entryInfo.localID,
        threadID: entryInfo.threadID,
        text: entryInfo.text,
        year: entryInfo.year,
        month: entryInfo.month,
        day: entryInfo.day,
        creationTime: entryInfo.creationTime,
        creator: entryInfo.creator,
        deleted: entryInfo.deleted,
        textHeight: Math.ceil(textHeight),
      };
    }
  }

  allHeightsMeasured = (
    listDataWithHeights: $ReadOnlyArray<CalendarItemWithHeight>,
  ) => {
    this.setState({ listDataWithHeights });
  };

  onViewableItemsChanged = (info: ViewableItemsChange) => {
    const ldwh = this.state.listDataWithHeights;
    if (!ldwh) {
      // This indicates the listData was cleared (set to null) right before this
      // callback was called. Since this leads to the FlatList getting cleared,
      // we'll just ignore this callback.
      return;
    }

    const visibleEntries = {};
    for (const token of info.viewableItems) {
      if (token.item.itemType === 'entryInfo') {
        visibleEntries[entryKey(token.item.entryInfo)] = true;
      }
    }
    this.latestExtraData = {
      activeEntries: _pickBy((_, key: string) => {
        if (visibleEntries[key]) {
          return true;
        }
        // We don't automatically set scrolled-away entries to be inactive
        // because entries can be out-of-view at creation time if they need to
        // be scrolled into view (see onEnterEntryEditMode). If Entry could
        // distinguish the reasons its active prop gets set to false, it could
        // differentiate the out-of-view case from the something-pressed case,
        // and then we could set scrolled-away entries to be inactive without
        // worrying about this edge case. Until then...
        const foundItem = _find(
          item => item.entryInfo && entryKey(item.entryInfo) === key,
        )(ldwh);
        return !!foundItem;
      })(this.latestExtraData.activeEntries),
      visibleEntries,
    };

    const topLoader = _find({ key: 'TopLoader' })(info.viewableItems);
    if (this.topLoaderWaitingToLeaveView && !topLoader) {
      this.topLoaderWaitingToLeaveView = false;
      this.topLoadingFromScroll = null;
    }

    const bottomLoader = _find({ key: 'BottomLoader' })(info.viewableItems);
    if (this.bottomLoaderWaitingToLeaveView && !bottomLoader) {
      this.bottomLoaderWaitingToLeaveView = false;
      this.bottomLoadingFromScroll = null;
    }

    if (
      !this.state.readyToShowList &&
      !this.topLoaderWaitingToLeaveView &&
      !this.bottomLoaderWaitingToLeaveView &&
      info.viewableItems.length > 0
    ) {
      this.setState({
        readyToShowList: true,
        extraData: this.latestExtraData,
      });
    }

    if (
      topLoader &&
      !this.topLoaderWaitingToLeaveView &&
      !this.topLoadingFromScroll
    ) {
      this.topLoaderWaitingToLeaveView = true;
      const start = dateFromString(this.props.startDate);
      start.setDate(start.getDate() - 31);
      const startDate = dateString(start);
      const endDate = this.props.endDate;
      this.topLoadingFromScroll = {
        startDate,
        endDate,
        filters: this.props.calendarFilters,
      };
      this.loadMoreAbove();
    } else if (
      bottomLoader &&
      !this.bottomLoaderWaitingToLeaveView &&
      !this.bottomLoadingFromScroll
    ) {
      this.bottomLoaderWaitingToLeaveView = true;
      const end = dateFromString(this.props.endDate);
      end.setDate(end.getDate() + 31);
      const endDate = dateString(end);
      const startDate = this.props.startDate;
      this.bottomLoadingFromScroll = {
        startDate,
        endDate,
        filters: this.props.calendarFilters,
      };
      this.loadMoreBelow();
    }
  };

  dispatchCalendarQueryUpdate(calendarQuery: CalendarQuery) {
    this.props.dispatchActionPromise(
      updateCalendarQueryActionTypes,
      this.props.updateCalendarQuery(calendarQuery),
    );
  }

  loadMoreAbove = _throttle(() => {
    if (
      this.topLoadingFromScroll &&
      this.topLoaderWaitingToLeaveView &&
      this.props.connectionStatus === 'connected'
    ) {
      this.dispatchCalendarQueryUpdate(this.topLoadingFromScroll);
    }
  }, 1000);

  loadMoreBelow = _throttle(() => {
    if (
      this.bottomLoadingFromScroll &&
      this.bottomLoaderWaitingToLeaveView &&
      this.props.connectionStatus === 'connected'
    ) {
      this.dispatchCalendarQueryUpdate(this.bottomLoadingFromScroll);
    }
  }, 1000);

  onScroll = (event: ScrollEvent) => {
    this.currentScrollPosition = event.nativeEvent.contentOffset.y;
  };

  // When the user "flicks" the scroll view, this callback gets triggered after
  // the scrolling ends
  onMomentumScrollEnd = () => {
    this.setState({ extraData: this.latestExtraData });
  };

  // This callback gets triggered when the user lets go of scrolling the scroll
  // view, regardless of whether it was a "flick" or a pan
  onScrollEndDrag = () => {
    // We need to figure out if this was a flick or not. If it's a flick, we'll
    // let onMomentumScrollEnd handle it once scroll position stabilizes
    const currentScrollPosition = this.currentScrollPosition;
    setTimeout(() => {
      if (this.currentScrollPosition === currentScrollPosition) {
        this.setState({ extraData: this.latestExtraData });
      }
    }, 50);
  };

  onSaveEntry = () => {
    const entryKeys = Object.keys(this.latestExtraData.activeEntries);
    if (entryKeys.length === 0) {
      return;
    }
    const entryRef = this.entryRefs.get(entryKeys[0]);
    if (entryRef) {
      entryRef.completeEdit();
    }
  };
}

const unboundStyles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  flatList: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  keyboardAvoidingViewContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sectionHeader: {
    backgroundColor: 'panelSecondaryForeground',
    borderBottomWidth: 2,
    borderColor: 'listBackground',
    height: 31,
  },
  sectionHeaderText: {
    color: 'listSeparatorLabel',
    fontWeight: 'bold',
    padding: 5,
  },
  weekendSectionHeader: {},
};

const loadingStatusSelector = createLoadingStatusSelector(
  updateCalendarQueryActionTypes,
);
const activeTabSelector = createActiveTabSelector(CalendarRouteName);
const activeThreadPickerSelector = createIsForegroundSelector(
  ThreadPickerModalRouteName,
);

const ConnectedCalendar: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedCalendar(props: BaseProps) {
    const navContext = React.useContext(NavContext);
    const calendarActive =
      activeTabSelector(navContext) || activeThreadPickerSelector(navContext);

    const listData = useSelector(calendarListData);
    const startDate = useSelector(state => state.navInfo.startDate);
    const endDate = useSelector(state => state.navInfo.endDate);
    const calendarFilters = useSelector(state => state.calendarFilters);
    const dimensions = useSelector(derivedDimensionsInfoSelector);
    const loadingStatus = useSelector(loadingStatusSelector);
    const connectionStatus = useSelector(state => state.connection.status);
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();

    const dispatchActionPromise = useDispatchActionPromise();
    const callUpdateCalendarQuery = useServerCall(updateCalendarQuery);

    return (
      <Calendar
        {...props}
        calendarActive={calendarActive}
        listData={listData}
        startDate={startDate}
        endDate={endDate}
        calendarFilters={calendarFilters}
        dimensions={dimensions}
        loadingStatus={loadingStatus}
        connectionStatus={connectionStatus}
        colors={colors}
        styles={styles}
        indicatorStyle={indicatorStyle}
        dispatchActionPromise={dispatchActionPromise}
        updateCalendarQuery={callUpdateCalendarQuery}
      />
    );
  },
);

export default ConnectedCalendar;
