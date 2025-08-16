export function humanizeError(e: unknown): string {
  const msg = (e as any)?.message || String(e) || '';
  if (/NETWORK|Failed to fetch/i.test(msg)) return '网络异常，请稍后重试';
  if (/permission|RLS|not authorized/i.test(msg)) return '无权限操作';
  return msg;
}
