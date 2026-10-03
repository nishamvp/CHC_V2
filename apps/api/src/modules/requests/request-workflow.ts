import { RequestStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Readonly<
  Record<RequestStatus, readonly RequestStatus[]>
> = {
  NEW: [
    RequestStatus.PENDING_ASSIGNMENT,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  PENDING_ASSIGNMENT: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.HOS_HANDLING,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  IN_PROGRESS: [
    RequestStatus.PENDING_HOS_REVIEW,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  HOS_HANDLING: [
    RequestStatus.REPLIED_TO_CHC,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  PENDING_HOS_REVIEW: [
    RequestStatus.REPLIED_TO_CHC,
    RequestStatus.REJECTED_BY_HOS,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  REJECTED_BY_HOS: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  REPLIED_TO_CHC: [
    RequestStatus.COMPLETED,
    RequestStatus.REJECTED,
    RequestStatus.CLOSED,
  ],
  COMPLETED: [RequestStatus.REOPENED, RequestStatus.CLOSED],
  REOPENED: [
    RequestStatus.IN_PROGRESS,
    RequestStatus.PENDING_ASSIGNMENT,
    RequestStatus.CLOSED,
  ],
  REJECTED: [],
  CLOSED: [],
};
