import { TFile, type App } from "obsidian";
import type { AnchorMode, HopLinkViewerSettings } from "./constants";

function isValidAnchorFile(file: TFile): boolean {
	return file.extension === "md";
}

function resolveFilePath(app: App, path: string | null): TFile | null {
	if (!path) return null;
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile && isValidAnchorFile(file) ? file : null;
}

export function resolveLastViewed(app: App): TFile | null {
	const active = app.workspace.getActiveFile();
	if (active && isValidAnchorFile(active)) {
		return active;
	}

	const recent = app.workspace.getLastOpenFiles();
	for (const path of recent) {
		const file = app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile && isValidAnchorFile(file)) {
			return file;
		}
	}

	return null;
}

export function resolveLastEdited(app: App, lastEditedPath: string | null): TFile | null {
	return resolveFilePath(app, lastEditedPath) ?? resolveLastViewed(app);
}

export function resolveActiveFile(app: App): TFile | null {
	const active = app.workspace.getActiveFile();
	if (active && isValidAnchorFile(active)) {
		return active;
	}
	return null;
}

export function resolveAnchor(
	app: App,
	settings: HopLinkViewerSettings,
	lastEditedPath: string | null,
	mode?: AnchorMode
): TFile | null {
	const anchorMode = mode ?? settings.anchorMode;

	switch (anchorMode) {
		case "last-edited":
			return resolveLastEdited(app, lastEditedPath);
		case "last-viewed":
			return resolveLastViewed(app);
		case "active-file":
		default:
			return resolveActiveFile(app);
	}
}
