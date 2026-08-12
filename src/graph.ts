import { normalizePath, TFile, type App } from "obsidian";
import type { HopLinkViewerSettings, LinkSuggestion, SortOrder } from "./constants";

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
		if (!this.connections.has(a)) this.connections.set(a, new Set());
		if (!this.connections.has(b)) this.connections.set(b, new Set());
		this.connections.get(a)!.add(b);
		this.connections.get(b)!.add(a);
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

function shuffleSuggestions<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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

export function hopSuggestions(
	app: App,
	anchorPath: string,
	settings: HopLinkViewerSettings
): LinkSuggestion[] {
	const graph = buildGraph(app);
	const getConnections = (path: string) => graph.getConnections(path);

	const suggestions: LinkSuggestion[] = [];
	const seen = new Set<string>([anchorPath]);
	let currentLevel = new Set(getConnections(anchorPath));

	for (let hop = 1; hop <= settings.hops; hop++) {
		for (const path of currentLevel) {
			if (seen.has(path)) continue;
			if (!passesPathFilters(path, anchorPath, settings)) continue;

			seen.add(path);

			if (hop === 1) {
				if (settings.includeDirectLinks) {
					suggestions.push({ path, isDirectLink: true, hop });
				}
			} else {
				suggestions.push({ path, isDirectLink: false, hop });
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

	return sortSuggestions(app, suggestions, graph, settings.sortOrder).slice(
		0,
		settings.displayCap
	);
}
