import { PaginatedResult, PaginationParams } from "src/types/pagination";

/**
 * Builds pagination, search, and sort parameters for APIs.
 * @param params Query params from request
 * @param allowedFields Fields allowed to sort on (API → DB mapping)
 * @param defaultSort Default sort string, e.g., "createdAt:desc"
 */
export function buildQuery(
  params: PaginationParams,
  allowedFields: Record<string, string>,
  defaultSort: string = "createdAt:desc"
): PaginatedResult {
    //1) Eliminate extra space from side in seracy
    const search = params.search?.trim() || "";

    //2) Make sure we have valid page and limit values handle fallbacks
    const pageNum = Number(params.page);
    const limitNum = Number(params.limit);

    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 10;

    //3) Handle multi column sort mapping
    const sortParam = params.sort || defaultSort;
    const orderBy: Record<string, "ASC" | "DESC"> = {};

    const sortParts = sortParam.split(",");
    for (const part of sortParts) {
        const [field, dirRaw] = part.split(":");
        if (!allowedFields[field]) continue;

        const direction = (dirRaw || "asc").toLowerCase() === "asc" ? "ASC" : "DESC";
        orderBy[allowedFields[field]] = direction;
    }

    //4) Fallback if no valid sort provided
    if (Object.keys(orderBy).length === 0 && allowedFields["createdAt"]) {
        orderBy[allowedFields["createdAt"]] = "DESC";
    }

    //5) Return updated paginated params
    return { search, page, limit, orderBy };
}