/** Format lỗi thống nhất — 04_API.md §4. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, msg: string, details?: unknown) => new ApiError(400, code, msg, details);
export const unauthorized = (msg = 'Chưa đăng nhập') => new ApiError(401, 'UNAUTHENTICATED', msg);
export const forbidden = (msg = 'Không đủ quyền thực hiện thao tác này') => new ApiError(403, 'FORBIDDEN', msg);
export const notFound = (code: string, msg: string) => new ApiError(404, code, msg);
export const conflict = (code: string, msg: string) => new ApiError(409, code, msg);
