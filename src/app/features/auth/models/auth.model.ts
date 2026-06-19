export interface ApiResponse<TData> {
  success: boolean;
  data: TData;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProblemDetails {
  title?: string | null;
  detail?: string | null;
  status?: number | string | null;
  type?: string | null;
  instance?: string | null;
}

export interface JwtTokenPayload {
  userId: string;
  userName: string;
  userEmail: string;
  userTypeId: string;
  userTypeName: string;
  securityStamp: string;
  permission: string[];
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface AuthRole {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  roleName: string | null;
  permissionName: string | null;
}

export interface PortalConfiguration {
  id: string;
  name: string;
  description: string;
  status: boolean;
  theme: string;
  defaultLandingPage: string | null;
  logoUrl: string | null;
  language: string;
  additionalConfig: unknown;
  createdAt: string;
  updatedAt: string | null;
}

export interface AccountProfile {
  user: AuthUser;
  roles: AuthRole[];
  portalConfiguration: PortalConfiguration | null;
}

export interface MenuItem {
  label: string;
  route: string;
  description: string;
  icon: string;
}
