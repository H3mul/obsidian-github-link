import type { IssueSearchParams, IssueListParams, PullListParams, CommitSearchParams } from "../github/response";
import type { QueryParams } from "./types";

/**
 * Utility function to transform generic param sort into sort for issue search
 */
export function issueSearchSortFromQuery(params: QueryParams): IssueSearchParams["sort"] {
	if (params.sort && !["popularity", "long-running", "author-date", "committer-date"].includes(params.sort)) {
		const castSort = params.sort as IssueSearchParams["sort"];
		return ;
	}
	return undefined;
}

/**
 * Utility function to transform generic param sort into sort for commit search
 */
export function commitSearchSortFromQuery(params: QueryParams): CommitSearchParams["sort"] {
	if (params.sort && ["author-date", "committer-date"].includes(params.sort)) {
		return params.sort as CommitSearchParams["sort"];
	}
	return undefined;
}

/**
 * Utility function to transform generic param sort into sort for issue list
 */
export function issueListSortFromQuery(params: QueryParams): IssueListParams["sort"] {
	if (params.sort && ["created", "updated", "comments"].includes(params.sort)) {
		return params.sort as IssueListParams["sort"];
	}
	return undefined;
}

/**
 * Utility function to transform generic param sort into sort for pull list
 */
export function pullListSortFromQuery(params: QueryParams): PullListParams["sort"] {
	if (params.sort && ["created", "updated", "popularity", "long-running"].includes(params.sort)) {
		return params.sort as PullListParams["sort"];
	}
	return undefined;
}