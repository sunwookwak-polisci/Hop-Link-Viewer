import { normalizePath, TFile, type App } from "obsidian";
import {
	includeDirectLinks,
	type HopLinkViewerSettings,
	type HopNode,
	type HopWalkResult,
	type LinkSuggestion,
	type SortOrder,
} from "./constants";

export function isExcludedPath(path: string, excludedPaths: string[]): boolean {
	const normalizedPath = normalizePath(path);
	return excludedPaths.some((excludedPath) => {
		const normalizedExcludedPath = normalizePath(excludedPath.trim());
		return normalizedExcludedPath.length > 0 && (
			normalizedPath === normalizedExcludedPath ||
			normalizedPath.startsWith(`${normalizedExcludedPath}/`)
		);
	});
}

export function isValidTargetFile(path: string): boolean {
	const lower = path.toLowerCase();
	const hasNoExtension = !lower.includes(".");
	const isMarkdown = lower.endsWith(".md") || hasNoExtension;
	const isPDF = lower.endsWith(".pdf");
	return isMarkdown || isPDF;
}

export function isValidHopFile(file: TFile): boolean {
	return isValidTargetFile(file.path);
}

function passesPathFilters(path: string, anchorPath: string, settings: HopLinkViewerSettings): boolean {
	if (path === anchorPath) return false;
	if (isExcludedPath(path, settings.excludedPaths)) return false;
	return isValidTargetFile(path);
}

class LinkGraph {
	private connections = new Map<string, Set<string>>();

	constructor(resolvedLinks: Record<string, Record<string, number>>) {
		for (const [source, destinations] of Object.entries(resolvedLinks)) {
			for (const dest of Object.keys(destinations)) {
				this.addEdge(source, dest);
			}
		}
	}

	private addEdge(a: string, b: string): void {
		let aConnections = this.connections.get(a);
		if (!aConnections) {
			aConnections = new Set();
			this.connections.set(a, aConnections);
		}

		let bConnections = this.connections.get(b);
		if (!bConnections) {
			bConnections = new Set();
			this.connections.set(b, bConnections);
		}

		aConnections.add(b);
		bConnections.add(a);
	}

	getConnections(filePath: string): string[] {
		return Array.from(this.connections.get(filePath) ?? []);
	}

	getLinkCount(filePath: string): number {
		return this.connections.get(filePath)?.size ?? 0;
	}
}

function buildGraph(app: App): LinkGraph {
	return new LinkGraph(app.metadataCache.resolvedLinks);
}

function getDisplayName(app: App, path: string): string {
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile ? file.basename : path;
}

function getMtime(app: App, path: string): number {
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile ? file.stat.mtime : 0;
}

function shuffleSuggestions(items: LinkSuggestion[]): LinkSuggestion[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const itemAtI = shuffled[i];
		const itemAtJ = shuffled[j];
		if (!itemAtI || !itemAtJ) continue;
		shuffled[i] = itemAtJ;
		shuffled[j] = itemAtI;
	}
	return shuffled;
}

function sortSuggestions(
	app: App,
	suggestions: LinkSuggestion[],
	graph: LinkGraph,
	sortOrder: SortOrder
): LinkSuggestion[] {
	const sorted = [...suggestions];

	switch (sortOrder) {
		case "mtime-desc":
			return sorted.sort((a, b) => getMtime(app, b.path) - getMtime(app, a.path));
		case "mtime-asc":
			return sorted.sort((a, b) => getMtime(app, a.path) - getMtime(app, b.path));
		case "link-count-desc":
			return sorted.sort((a, b) => {
				const countDiff = graph.getLinkCount(b.path) - graph.getLinkCount(a.path);
				return countDiff !== 0
					? countDiff
					: getDisplayName(app, a.path).localeCompare(getDisplayName(app, b.path));
			});
		case "alphabetical":
			return sorted.sort((a, b) =>
				getDisplayName(app, a.path).localeCompare(getDisplayName(app, b.path))
			);
		case "random":
			return shuffleSuggestions(sorted);
		case "walk-order":
		default:
			return sorted;
	}
}

function toSuggestion(node: HopNode): LinkSuggestion {
	return {
		path: node.path,
		isDirectLink: node.isDirectLink,
		hop: node.hop,
	};
}

export function hopWalk(
	app: App,
	anchorPath: string,
	settings: HopLinkViewerSettings
): HopWalkResult {
	const graph = buildGraph(app);
	const getConnections = (path: string) => graph.getConnections(path);

	const distance = new Map<string, number>([[anchorPath, 0]]);
	const discoveryOrder: string[] = [];
	const suggestions: LinkSuggestion[] = [];
	let currentLevel = new Set(getConnections(anchorPath));

	for (let hop = 1; hop <= settings.hops; hop++) {
		for (const path of currentLevel) {
			if (distance.has(path)) continue;
			distance.set(path, hop);

			if (!passesPathFilters(path, anchorPath, settings)) continue;

			discoveryOrder.push(path);
			const isDirectLink = hop === 1;
			if (hop === 1) {
				if (includeDirectLinks(settings)) {
					suggestions.push({ path, isDirectLink, hop });
				}
			} else {
				suggestions.push({ path, isDirectLink, hop });
			}
		}

		if (hop < settings.hops) {
			const nextLevel = new Set<string>();
			for (const path of currentLevel) {
				for (const linked of getConnections(path)) {
					nextLevel.add(linked);
				}
			}
			currentLevel = nextLevel;
		}
	}

	const nodes = new Map<string, HopNode>();
	for (const path of discoveryOrder) {
		const hop = distance.get(path);
		if (hop === undefined) continue;

		const parents: string[] = [];
		const children: string[] = [];
		const neighborSet = new Set(getConnections(path));

		for (const candidate of discoveryOrder) {
			if (candidate === path || !neighborSet.has(candidate)) continue;
			const candidateHop = distance.get(candidate);
			if (candidateHop === hop - 1) {
				parents.push(candidate);
			} else if (candidateHop === hop + 1) {
				children.push(candidate);
			}
		}

		nodes.set(path, {
			path,
			hop,
			isDirectLink: hop === 1,
			parents,
			children,
		});
	}

	return {
		suggestions: sortSuggestions(app, suggestions, graph, settings.sortOrder),
		nodes,
	};
}

export function sortHopNodes(
	app: App,
	nodes: HopNode[],
	settings: HopLinkViewerSettings
): HopNode[] {
	if (nodes.length <= 1) return nodes;
	const graph = buildGraph(app);
	const sorted = sortSuggestions(
		app,
		nodes.map(toSuggestion),
		graph,
		settings.sortOrder
	);
	const byPath = new Map(nodes.map((node) => [node.path, node]));
	return sorted.flatMap((suggestion) => {
		const node = byPath.get(suggestion.path);
		return node ? [node] : [];
	});
}

export function hopSuggestions(
	app: App,
	anchorPath: string,
	settings: HopLinkViewerSettings
): LinkSuggestion[] {
	return hopWalk(app, anchorPath, settings).suggestions;
}
