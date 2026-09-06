export const VIEW_TYPE_HOP_LINK_VIEWER = "hop-link-viewer-view";

export const DEFAULT_SETTINGS = {
	hops: 3,
	displayCap: 15,
	excludedPaths: [],
	anchorMode: "active-file" as AnchorMode,
	sortOrder: "walk-order" as SortOrder,
	includeDirectLinks: false,
	autoOpenSidebar: false,
	hierarchyStyle: "list" as HierarchyStyle,
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

export type HierarchyStyle = "list" | "chain" | "single";

export const HIERARCHY_STYLE_ORDER: HierarchyStyle[] = ["list", "chain", "single"];

export const HIERARCHY_STYLE_LABELS: Record<HierarchyStyle, string> = {
	list: "List",
	chain: "Chain",
	single: "Single",
};

export function parseHierarchyStyle(value: unknown): HierarchyStyle | null {
	if (value === "list" || value === "chain" || value === "single") return value;
	if (value === "track-up" || value === "path-tree") return "chain";
	if (value === "parents" || value === "dag") return "single";
	return null;
}

export function isHierarchyStyle(value: unknown): value is HierarchyStyle {
	return value === "list" || value === "chain" || value === "single";
}

export function nextHierarchyStyle(current: HierarchyStyle): HierarchyStyle {
	const index = HIERARCHY_STYLE_ORDER.indexOf(current);
	const nextIndex = index < 0 ? 1 : (index + 1) % HIERARCHY_STYLE_ORDER.length;
	return HIERARCHY_STYLE_ORDER[nextIndex] ?? "list";
}

export interface HopLinkViewerSettings {
	hops: number;
	displayCap: number;
	excludedPaths: string[];
	anchorMode: AnchorMode;
	sortOrder: SortOrder;
	includeDirectLinks: boolean;
	autoOpenSidebar: boolean;
	hierarchyStyle: HierarchyStyle;
}

export interface HopNode {
	path: string;
	hop: number;
	isDirectLink: boolean;
	parents: string[];
	children: string[];
}

export interface HopWalkResult {
	suggestions: LinkSuggestion[];
	nodes: Map<string, HopNode>;
}

export interface LinkSuggestion {
	path: string;
	isDirectLink: boolean;
	hop: number;
}
