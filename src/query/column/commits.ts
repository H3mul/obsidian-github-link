import { CommitSearchResponse } from "../../github/response";
import { parseUrl, repoAPIToBrowserUrl } from "../../github/url-parse";
import { DateCell, UserCell, type ColumnsMap } from "./base";

export const CommitColumns: ColumnsMap  = {
	number: {
		header: "Number",
		cell: (tableRow, el) => {
            const row = tableRow as CommitSearchResponse["items"][number];
			el.classList.add("github-link-table-commit-sha");
			el.createEl("a", { text: `#${row.sha.slice(0,7)}`, href: row.html_url, attr: { target: "_blank" } });
		},
	},
    title: {
		header: "Message",
		cell: (tableRow, el) => {
            const row = tableRow as CommitSearchResponse["items"][number];
			el.classList.add("github-link-table-commit-title");
            el.setText(row.commit.message);
		},
    },
	repo: {
		header: "Repo",
		cell: (tableRow, el) => {
            const row = tableRow as CommitSearchResponse["items"][number];
			el.classList.add("github-link-table-repo");
			const url = repoAPIToBrowserUrl((row).repository.url);
			const parsed = parseUrl(url);
			el.createEl("a", { text: parsed?.repo ?? "Repo", href: url, attr: { target: "_blank" } });
		},
	},
	author: {
		header: "Author",
		cell: (tableRow, el) => {
            const row = tableRow as CommitSearchResponse["items"][number];
			UserCell(row.author, el);
		},
	},
	created: {
		header: "Created",
		cell: (tableRow, el) => {
            const row = tableRow as CommitSearchResponse["items"][number];
			DateCell(row.commit.author.date, el);
		},
	},
};