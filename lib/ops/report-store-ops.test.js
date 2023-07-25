// @flow

import { reportStoreOps } from './report-store-ops.js';
import {
  type ClientReportCreationRequest,
  reportTypes,
} from '../types/report-types.js';

const defaultReport = {
  type: reportTypes.MEDIA_MISSION,
  time: Date.now(),
  mediaMission: {
    steps: [],
    result: { success: true },
    totalTime: 0,
    userTime: 0,
  },
};

const defaultMockReportWeb = {
  platformDetails: { platform: 'web' },
  ...defaultReport,
};

const defaultMockReportIos = {
  platformDetails: { platform: 'ios' },
  ...defaultReport,
};

const mockReports: $ReadOnlyArray<ClientReportCreationRequest> = [
  {
    ...defaultMockReportWeb,
    id: '1',
  },
  {
    ...defaultMockReportWeb,
    id: '2',
  },
  {
    ...defaultMockReportWeb,
    id: '3',
  },
];

const sortReports = (
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
): $ReadOnlyArray<ClientReportCreationRequest> => {
  return [...queuedReports].sort(
    (a: ClientReportCreationRequest, b: ClientReportCreationRequest) =>
      a.id.localeCompare(b.id),
  );
};

const { processStoreOperations: processReportStoreOperations } = reportStoreOps;

describe('processReportStoreOperations', () => {
  it('should return the original reports if no operations are processed', () => {
    const reportOps = [];
    const processedReports = processReportStoreOperations(
      mockReports,
      reportOps,
    );
    expect(processedReports).toEqual(mockReports);
  });

  it('should replace the report with the given id', () => {
    const reportOps = [
      {
        type: 'replace_report',
        payload: {
          report: {
            ...defaultMockReportIos,
            id: '2',
          },
        },
      },
    ];
    const expectedReports = [
      {
        ...defaultMockReportWeb,
        id: '1',
      },
      {
        ...defaultMockReportIos,
        id: '2',
      },
      {
        ...defaultMockReportWeb,
        id: '3',
      },
    ];
    const processedReports = processReportStoreOperations(
      mockReports,
      reportOps,
    );

    expect(sortReports(processedReports)).toEqual(sortReports(expectedReports));
  });

  it('should handle an empty reports with replace operation', () => {
    const reportOps = [
      {
        type: 'replace_report',
        payload: {
          report: {
            ...defaultMockReportWeb,
            id: '1',
          },
        },
      },
    ];
    const expectedReports = [
      {
        ...defaultMockReportWeb,
        id: '1',
      },
    ];

    const processedReports = processReportStoreOperations([], reportOps);
    expect(processedReports).toEqual(expectedReports);
  });

  it('should remove reports with given ids', () => {
    const reportOps = [
      {
        type: 'remove_reports',
        payload: {
          ids: ['1', '2'],
        },
      },
    ];
    const expectedReports = [
      {
        ...defaultMockReportWeb,
        id: '3',
      },
    ];
    const processedReports = processReportStoreOperations(
      mockReports,
      reportOps,
    );
    expect(processedReports).toEqual(expectedReports);
  });

  it('should handle empty reports with remove_reports operation', () => {
    const reportOps = [
      {
        type: 'remove_reports',
        payload: {
          ids: ['1', '2'],
        },
      },
    ];

    const processedReports = processReportStoreOperations([], reportOps);
    expect(processedReports).toEqual([]);
  });

  it('should remove all reports', () => {
    const reportOps = [
      {
        type: 'remove_all_reports',
      },
    ];
    const processedReports = processReportStoreOperations(
      mockReports,
      reportOps,
    );
    expect(processedReports).toEqual([]);
  });

  it('should handle empty reports with remove_all_reports operation', () => {
    const reportOps = [
      {
        type: 'remove_all_reports',
      },
    ];

    const processedReports = processReportStoreOperations([], reportOps);
    expect(processedReports).toEqual([]);
  });
});
