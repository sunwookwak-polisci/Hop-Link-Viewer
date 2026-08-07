import { TFile, type App } from "obsidian";
import type { AnchorMode, HopLinkViewerSettings } from "./constants";

function isValidAnchorFile(file: TFile): boolean {
	return file.extension === "md";
}

export function resolveLastEdited(app: App, _settings: HopLinkViewerSettings): TFile | null {
	const markdownFiles = app.vault.getMarkdownFiles();
	let best: TFile | null = null;
	let bestMtime = 0;

	for (const file of markdownFiles) {
		if (!isValidAnchorFile(file)) continue;
		const stat = file.stat;
		if (stat.mtime > bestMtime) {
			bestMtime = stat.mtime;
			best = file;
		}
	}

	return best;
}

export function resolveLastViewed(app: App, _settings: HopLinkViewerSettings): TFile | null {
	const active = app.workspace.getActiveFile();
	if (active && isValidAnchorFile(active)) {
		return active;
	}

	const recent = app.workspace.getLastOpenFiles?.() ?? [];
	for (const path of recent) {
		const file = app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile && isValidAnchorFile(file)) {
			return file;
		}
	}

	return null;
}

export function resolveActiveFile(app: App, _settings: HopLinkViewerSettings): TFile | null {
	const active = app.workspace.getActiveFile();
	if (active && isValidAnchorFile(active)) {
		return active;
	}
	return null;
}

export function resolveAnchor(
	app: App,
	settings: HopLinkViewerSettings,
	mode?: AnchorMode
): TFile | null {
	const anchorMode = mode ?? settings.anchorMode;

	switch (anchorMode) {
		case "last-edited":
			return resolveLastEdited(app, settings);
		case "last-viewed":
			return resolveLastViewed(app, settings);
		case "active-file":
		default:
			return resolveActiveFile(app, settings);
	}
}
