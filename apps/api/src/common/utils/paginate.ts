import type { Paginated } from '@site/shared';

export function toPage<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
