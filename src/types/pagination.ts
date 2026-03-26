export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    shipmentType?: string;
    [key: string]: any;
}

export interface PaginatedResult {
  search: string;
  page: number;
  limit: number;
  orderBy: Record<string, "ASC" | "DESC">;
}