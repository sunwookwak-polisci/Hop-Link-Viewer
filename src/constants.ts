export const VIEW_TYPE_HOP_LINK_VIEWER = "hop-link-viewer-view";

export const DEFAULT_SETTINGS = {
	hops: 3,
	displayCap: 10,
	excludedPaths: [],
	anchorMode: "active-file" as AnchorMode,
	sortOrder: "walk-order" as SortOrder,
	includeDirectLinks: false,
	autoOpenSidebar: false,
};

export type ViewerLocation = "sidebar" | "below" | "right";

export type AnchorMode = "active-file" | "last-edited" | "last-viewed";

export type SortOrder =
	| "walk-order"
	| "mtime-desc"
	| "mtime-asc"
	| "link-count-desc"
	| "alphabetical"
	| "random";

export interface HopLinkViewerSettings {
	hops: number;
	displayCap: number;
	excludedPaths: string[];
	anchorMode: AnchorMode;
	sortOrder: SortOrder;
	includeDirectLinks: boolean;
	autoOpenSidebar: boolean;
}

export interface LinkSuggestion {
	path: string;
	isDirectLink: boolean;
	hop: number;
}
