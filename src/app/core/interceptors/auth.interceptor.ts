import { HttpInterceptorFn } from '@angular/common/http';

import {
  API_BASE_URL,
  AUTH_API_BASE_URL,
  AUTH_TOKEN_STORAGE_KEY,
} from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const isAuthApiRequest = request.url.startsWith(AUTH_API_BASE_URL);
  const isDomainApiRequest = request.url.startsWith(API_BASE_URL);
  const isLoginRequest = request.url.includes('/Api/Auth/Login');
  const shouldAttachToken = isAuthApiRequest || isDomainApiRequest;

  if (
    !token ||
    request.headers.has('Authorization') ||
    !shouldAttachToken ||
    isLoginRequest
  ) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
