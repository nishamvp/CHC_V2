export const APP_PERMISSIONS = {
  DEPARTMENT_MANAGE: "department.manage",
  DEPARTMENT_MEMBERSHIP_MANAGE: "department.membership.manage",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  REQUEST_CREATE: "request.create",
  REQUEST_REOPEN: "request.reopen",
  REQUEST_ASSIGN: "request.assign",
} as const;

export type AppPermission =
  (typeof APP_PERMISSIONS)[keyof typeof APP_PERMISSIONS];
