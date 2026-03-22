// src/utils/errorUtils.ts
export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as any;
    const data = e?.response?.data;
    if (data?.message) return data.message;
    if (data?.detail)  return data.detail;
  }
  return 'Something went wrong';
}