export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginatedResponse<T>(
  items: T[],
  query: PaginationQuery,
  total: number,
): PaginatedResponse<T> {
  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}
