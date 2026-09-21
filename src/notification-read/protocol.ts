export const READ_REQUEST = 'xpro-tweaks:read-notifications';
export const READ_RESPONSE = 'xpro-tweaks:read-notifications-result';
export const READ_ENABLED = 'xpro-tweaks:set-notification-read-enabled';

export type ReadEnabled = {
  type: typeof READ_ENABLED;
  enabled: boolean;
};

export type ReadRequest = {
  type: typeof READ_REQUEST;
  requestId: number;
  columnId: string;
};

export type ReadStatus = 'marked' | 'nothing-pending' | 'mismatch' | 'failed';

export type ReadResponse = {
  type: typeof READ_RESPONSE;
  requestId: number;
  status: ReadStatus;
};
