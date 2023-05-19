// @flow

import reduceReportStore from './report-store-reducer.js';
import type { LogInResult } from '../types/account-types.js';
import type { LoadingInfo } from '../types/loading-types.js';
import type { AppState, BaseAction } from '../types/redux-types.js';
import {
  type ReportStore,
  reportTypes,
  type MediaMissionReportCreationRequest,
  type ErrorReportCreationRequest,
  type EnabledReports,
  type ClientThreadInconsistencyReportCreationRequest,
} from '../types/report-types.js';

const loadingInfo: LoadingInfo = {
  fetchIndex: 0,
  trackMultipleRequests: false,
  customKeyName: undefined,
};

// this is only for types compatibility and `any` will not have any influence
// on tests correctness
const defaultState: AppState = ({}: any);
const defaultBaseAction: BaseAction = ({
  payload: ({}: any),
  loadingInfo,
}: any);
const defaultAction = {
  payload: ({}: any),
  loadingInfo,
};

const mockErrorReport: ErrorReportCreationRequest = {
  type: reportTypes.ERROR,
  platformDetails: { platform: 'web' },
  errors: [],
  preloadedState: defaultState,
  currentState: defaultState,
  actions: [],
  id: '1-1',
};

const mockInconsistencyReport: ClientThreadInconsistencyReportCreationRequest =
  {
    type: reportTypes.THREAD_INCONSISTENCY,
    platformDetails: { platform: 'web' },
    beforeAction: {},
    action: defaultBaseAction,
    pushResult: {},
    lastActions: [],
    time: 0,
    id: '1-2',
  };

const mockMediaReport: MediaMissionReportCreationRequest = {
  type: reportTypes.MEDIA_MISSION,
  platformDetails: { platform: 'web' },
  time: Date.now(),
  mediaMission: {
    steps: [],
    result: { success: true },
    totalTime: 0,
    userTime: 0,
  },
  id: '1-3',
};

const defaultEnabledReports: EnabledReports = {
  crashReports: true,
  inconsistencyReports: true,
  mediaReports: true,
};

const defaultEmptyReportStore: ReportStore = {
  queuedReports: [],
  enabledReports: defaultEnabledReports,
};

const defaultReportStore: ReportStore = {
  queuedReports: [mockErrorReport, mockInconsistencyReport, mockMediaReport],
  enabledReports: defaultEnabledReports,
};

describe('session change test', () => {
  const mockLogInResult: LogInResult = ({
    currentUserInfo: { id: '-1', username: 'test' },
  }: any);

  test('should handle log out', () => {
    const action = { ...defaultAction, type: 'LOG_OUT_SUCCESS' };
    const result = reduceReportStore(defaultReportStore, action, []);
    expect(result.queuedReports).toHaveLength(0);
  });

  test('should handle log out with new inconsistencies', () => {
    const action = { ...defaultAction, type: 'LOG_OUT_SUCCESS' };
    const result = reduceReportStore(defaultReportStore, action, [
      mockErrorReport,
    ]);
    expect(result.queuedReports).toHaveLength(0);
  });

  test('should handle log in', () => {
    const action = {
      type: 'LOG_IN_SUCCESS',
      payload: mockLogInResult,
      loadingInfo,
    };
    const result = reduceReportStore(defaultReportStore, action, []);
    expect(result.queuedReports).toHaveLength(0);
  });

  test('should handle log in with new inconsistencies', () => {
    const action = {
      type: 'LOG_IN_SUCCESS',
      payload: mockLogInResult,
      loadingInfo,
    };
    const result = reduceReportStore(defaultReportStore, action, [
      mockErrorReport,
    ]);
    expect(result.queuedReports).toHaveLength(0);
  });
});

describe('updateReportsEnabledActionType test', () => {
  test('should handle the same enabled reports', () => {
    const action = {
      type: 'UPDATE_REPORTS_ENABLED',
      payload: defaultEnabledReports,
    };
    const result = reduceReportStore(defaultReportStore, action, []);
    expect(result.queuedReports).toStrictEqual(
      defaultReportStore.queuedReports,
    );
  });

  test('should handle changing enabled reports', () => {
    const action = {
      type: 'UPDATE_REPORTS_ENABLED',
      payload: {
        crashReports: true,
        inconsistencyReports: false,
        mediaReports: false,
      },
    };
    const result = reduceReportStore(defaultReportStore, action, []);
    expect(result.queuedReports).toHaveLength(1);
    const enabledReportsExist = result.queuedReports.some(
      report => report.type === reportTypes.ERROR,
    );
    const notEnabledReportsExist = result.queuedReports.some(
      report => report.type !== reportTypes.ERROR,
    );
    expect(enabledReportsExist).toBeTruthy();
    expect(notEnabledReportsExist).toBeFalsy();
  });

  test('should handle changing enabled reports with new inconsistencies', () => {
    const action = {
      type: 'UPDATE_REPORTS_ENABLED',
      payload: {
        crashReports: true,
        inconsistencyReports: false,
        mediaReports: false,
      },
    };
    const result = reduceReportStore(defaultReportStore, action, [
      { ...mockErrorReport, id: 'new-id-error' },
      { ...mockMediaReport, id: 'new-id-media' },
    ]);
    expect(result.queuedReports).toHaveLength(2);
    const enabledReports = result.queuedReports.filter(
      report => report.type === reportTypes.ERROR,
    );
    const notEnabledReportsExist = result.queuedReports.some(
      report => report.type !== reportTypes.ERROR,
    );
    expect(enabledReports).toHaveLength(2);
    expect(notEnabledReportsExist).toBeFalsy();
  });
});

describe('queueReportsActionType test', () => {
  test('should handle adding enabled report', () => {
    const action = {
      type: 'QUEUE_REPORTS',
      payload: {
        reports: [
          { ...mockErrorReport, id: 'new-id-error' },
          { ...mockMediaReport, id: 'new-id-media' },
        ],
      },
    };
    const reportStore = {
      queuedReports: [mockErrorReport],
      enabledReports: {
        crashReports: true,
        inconsistencyReports: false,
        mediaReports: false,
      },
    };
    const result = reduceReportStore(reportStore, action, [
      { ...mockErrorReport, id: 'new-id-error-inc' },
      { ...mockMediaReport, id: 'new-id-media-inc' },
    ]);
    expect(result.queuedReports).toHaveLength(3);
    const enabledReports = result.queuedReports.filter(
      report => report.type === reportTypes.ERROR,
    );
    const notEnabledReportsExist = result.queuedReports.some(
      report => report.type !== reportTypes.ERROR,
    );
    expect(enabledReports).toHaveLength(3);
    expect(notEnabledReportsExist).toBeFalsy();
  });
});

describe('sending report test', () => {
  test('should remove sent report', () => {
    const reportStore = reduceReportStore(
      defaultEmptyReportStore,
      defaultBaseAction,
      [mockErrorReport, mockMediaReport],
    );
    expect(reportStore.queuedReports).toHaveLength(2);
    const [sentReport, notSentReport] = reportStore.queuedReports;

    const action = {
      type: 'SEND_REPORT_SUCCESS',
      payload: {
        reports: [sentReport],
      },
      loadingInfo,
    };
    const result = reduceReportStore(reportStore, action, []);
    expect(result.queuedReports).toHaveLength(1);
    expect(result.queuedReports).toContain(notSentReport);
    expect(result.queuedReports).not.toContain(sentReport);
  });

  test('should remove sent report and handle new inconsistencies', () => {
    const reportStore = reduceReportStore(
      defaultEmptyReportStore,
      defaultBaseAction,
      [mockErrorReport, mockMediaReport],
    );
    expect(reportStore.queuedReports).toHaveLength(2);
    const [sentReport, notSentReport] = reportStore.queuedReports;

    const action = {
      type: 'SEND_REPORT_SUCCESS',
      payload: {
        reports: [sentReport],
      },
      loadingInfo,
    };
    const result = reduceReportStore(reportStore, action, [
      mockInconsistencyReport,
    ]);
    expect(result.queuedReports).toHaveLength(2);
    expect(result.queuedReports).toContain(notSentReport);
    expect(result.queuedReports).not.toContain(sentReport);
  });
});

describe('new inconsistencies test', () => {
  test('should handle new inconsistencies without any action', () => {
    const reportStore = reduceReportStore(
      {
        queuedReports: [mockErrorReport],
        enabledReports: {
          crashReports: true,
          inconsistencyReports: false,
          mediaReports: false,
        },
      },
      defaultBaseAction,
      [
        { ...mockErrorReport, id: 'new-id-error' },
        { ...mockMediaReport, id: 'new-id-media' },
      ],
    );
    expect(reportStore.queuedReports).toHaveLength(2);
  });
});
