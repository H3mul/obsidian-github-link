import { RequestError, mapObject } from "../util";

import type { GithubAccount } from "../settings";
import { PluginSettings } from "../plugin";
import { commitSearchSortFromQuery, issueListSortFromQuery, issueSearchSortFromQuery, pullListSortFromQuery } from "../query/sort";
import type { QueryParams } from "../query/types";
import { GitHubApi } from "./api";
import type {
	CheckRunListResponse,
	CommitListParams,
	CommitListResponse,
	CommitSearchParams,
	CommitSearchResponse,
	IssueListParams,
	IssueListResponse,
	IssueResponse,
	IssueSearchParams,
	IssueSearchResponse,
	IssueTimelineResponse,
	MaybePaginated,
	PullListParams,
	PullListResponse,
	PullResponse,
	TimelineCrossReferencedEvent,
} from "./response";
import { parseFrontMatterStringArray } from "obsidian";

// TODO: Refactor this whole file into a class for better use in dataview queries, etc

const tokenMatchRegex = /repo:(.+)\//;
const api = new GitHubApi();

function getAccount(org?: string): GithubAccount | undefined {
	const account =
		PluginSettings.accounts.find((acc) => acc.orgs.some((savedOrg) => savedOrg === org)) ??
		PluginSettings.accounts.find((acc) => acc.id === PluginSettings.defaultAccount);
	return account;
}

function getToken(org?: string, query?: string): string | undefined {
	let _org = org;

	// Try and parse org from the query
	if (!org && query) {
		const match = tokenMatchRegex.exec(query);
		if (match?.[0] !== null) {
			_org = match?.[1];
		}
	}

	const account = getAccount(_org);
	return account?.token;
}

/**
 * Utility function: automatically add supported commit search query parameters from input parameters
 */
function commitSearchQueryFromParams(params: QueryParams) {
	const query = [params.query];

	params.org 	&& query.push("org:" + params.org);
	params.repo && query.push("repo:" + params.repo);

	return query.join(" ");
}

export function getIssue(org: string, repo: string, issue: number, skipCache = false): Promise<IssueResponse> {
	return api.getIssue(org, repo, issue, getToken(org), skipCache);
}

export function getMyIssues(
	params: QueryParams,
	org?: string,
	skipCache = false,
): Promise<MaybePaginated<IssueListResponse>> {
	const account = getAccount(org);
	if (!account?.token) {
		return Promise.resolve({ meta: {}, response: [] });
	}

	return api.listIssuesForToken(toIssueListParams(params), account.token, skipCache);
}

export function getIssuesForRepo(
	params: QueryParams,
	org: string,
	repo: string,
	skipCache = false,
): Promise<MaybePaginated<IssueListResponse>> {
	return api.listIssuesForRepo(org, repo, toIssueListParams(params), getToken(org), skipCache);
}

export function getIssuesForOrganization(
	params: QueryParams,
	org: string,
	skipCache = false,
): Promise<MaybePaginated<IssueListResponse>> {
	const listParams = mapObject<QueryParams, IssueListParams>(
		params,
		{
			assignee: true,
			creator: true,
			direction: true,
			labels: (params) => {
				if (Array.isArray(params.labels)) {
					return params.labels.join(",");
				}
				return params.labels;
			},
			mentioned: true,
			page: true,
			per_page: true,
			since: true,
			sort: (params) => issueListSortFromQuery(params),
			state: true,
			filter: true,
		},
		true,
		true,
	);

	setPageSize(listParams);

	return api.listIssuesForOrganization(org, listParams, getToken(org), skipCache);
}

export function getPullRequest(
	org: string,
	repo: string,
	pullRequest: number,
	skipCache = false,
): Promise<PullResponse> {
	return api.getPullRequest(org, repo, pullRequest, getToken(org), skipCache);
}

export function getPullRequestsForRepo(
	params: QueryParams,
	org: string,
	repo: string,
	skipCache = false,
): Promise<MaybePaginated<PullListResponse>> {
	const listParams = mapObject<QueryParams, PullListParams>(
		params,
		{
			direction: true,
			page: true,
			per_page: true,
			sort: (params) => pullListSortFromQuery(params),
			state: true,
		},
		true,
		true,
	);

	setPageSize(listParams);
	return api.listPullRequestsForRepo(org, repo, listParams, getToken(org), skipCache);
}

export function listCheckRunsForRef(
	org: string,
	repo: string,
	ref: string,
	skipCache = false,
): Promise<CheckRunListResponse> {
	return api.listCheckRunsForRef(org, repo, ref, getToken(org), skipCache);
}

export function getCommitsForRepo(
	params: QueryParams,
	org: string,
	repo: string,
	skipCache = false,
): Promise<MaybePaginated<CommitListResponse>> {
	const listParams = mapObject<QueryParams, CommitListParams>(
		params,
		{
			sha: true,
			path: true,
			author: true,
			committer: true,
			since: true,
			until: true,
			page: true,
			per_page: true,
		},
		true,
		true,
	);

	setPageSize(listParams);
	return api.listCommits(org, repo, listParams, getToken(org), skipCache);
}

export async function searchCommits(
	params: QueryParams,
	query: string,
	org?: string,
	skipCache = false,
): Promise<MaybePaginated<CommitSearchResponse>> {
	const searchParams = mapObject<QueryParams, CommitSearchParams>(
		params,
		{
			q: () => commitSearchQueryFromParams(params),
			sort: (params) => commitSearchSortFromQuery(params),
			order: (params) => params.order,
			page: (params) => params.page,
			per_page: (params) => params.per_page,
		},
		true,
		true,
	);

	setPageSize(searchParams);
	return api.searchCommits(searchParams, getToken(org, query), skipCache);
}

export async function searchIssues(
	params: QueryParams,
	query: string,
	org?: string,
	skipCache = false,
): Promise<MaybePaginated<IssueSearchResponse>> {
	const searchParams = mapObject<QueryParams, IssueSearchParams>(
		params,
		{
			q: () => query,
			sort: (params) => issueSearchSortFromQuery(params),
			order: (params) => params.order,
			page: (params) => params.page,
			per_page: (params) => params.per_page,
		},
		true,
		true,
	);

	setPageSize(searchParams);
	return api.searchIssues(searchParams, getToken(org, query), skipCache);
}

// TODO: This is in the wrong place and should be at the API level to be properly cached
export async function getPRForIssue(timelineUrl: string, org?: string): Promise<string | null> {
	let result: IssueTimelineResponse | null = null;
	try {
		const { response } = await api.queueRequest({ url: timelineUrl }, getToken(org));
		result = response.json as IssueTimelineResponse;
	} catch (err) {
		// 404 means there's no timeline for this, we can ignore the error
		if (err instanceof RequestError && err.status === 404) {
			return null;
		} else {
			throw err;
		}
	}
	if (!result) {
		return null;
	}

	// TODO: Figure out a better/more reliable way to do this.
	const crossRefEvent = result.find((_evt) => {
		const evt = _evt as Partial<TimelineCrossReferencedEvent>;
		return evt.event === "cross-referenced" && evt.source?.issue?.pull_request?.html_url;
	}) as TimelineCrossReferencedEvent | undefined;
	return crossRefEvent?.source.issue?.pull_request?.html_url ?? null;
}

function setPageSize(params: { per_page?: number }): void {
	params.per_page = params.per_page ?? PluginSettings.defaultPageSize;
}

function toIssueListParams(queryParams: QueryParams): IssueListParams {
	const listParams = mapObject<QueryParams, IssueListParams>(
		queryParams,
		{
			assignee: true,
			creator: true,
			direction: true,
			labels: (params) => {
				if (Array.isArray(params.labels)) {
					return params.labels.join(",");
				}
				return params.labels;
			},
			mentioned: true,
			page: true,
			per_page: true,
			since: true,
			sort: (params) => issueListSortFromQuery(params),
			state: true,
		},
		true,
		true,
	);
	setPageSize(listParams);
	return listParams;
}
