import { MarkdownView, TFile, type App, type WorkspaceLeaf } from "obsidian";
import type { HopLinkViewerSettings } from "./constants";

function isValidAnchorFile(file: TFile): boolean {
	return file.extension === "md";
}

function resolveFilePath(app: App, path: string | null): TFile | null {
	if (!path) return null;
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile && isValidAnchorFile(file) ? file : null;
}

function markdownFileFromLeaf(app: App, leaf: WorkspaceLeaf | null | undefined): TFile | null {
	if (!leaf) return null;
	if (leaf.view instanceof MarkdownView) {
		const file = leaf.view.file;
		if (file instanceof TFile && isValidAnchorFile(file)) return file;
	}

	const filePath = leaf.getViewState().state?.file;
	if (typeof filePath !== "string") return null;
	return resolveFilePath(app, filePath);
}

function resolveWindowActiveFile(app: App, viewerLeaf: WorkspaceLeaf): TFile | null {
	const container = viewerLeaf.getContainer();
	const recent = app.workspace.getMostRecentLeaf(container);
	if (recent && recent !== viewerLeaf) {
		const file = markdownFileFromLeaf(app, recent);
		if (file) return file;
	}

	let fallback: TFile | null = null;
	app.workspace.iterateRootLeaves((leaf) => {
		if (fallback || leaf === viewerLeaf) return;
		if (leaf.getContainer().win !== container.win) return;
		const file = markdownFileFromLeaf(app, leaf);
		if (file) fallback = file;
	});
	return fallback;
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

export function resolveActiveFile(app: App, viewerLeaf?: WorkspaceLeaf): TFile | null {
	if (viewerLeaf) {
		return resolveWindowActiveFile(app, viewerLeaf);
	}

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
	viewerLeaf?: WorkspaceLeaf
): TFile | null {
	switch (settings.anchorMode) {
		case "last-edited":
			return resolveLastEdited(app, lastEditedPath);
		case "last-viewed":
			return resolveLastViewed(app);
		case "active-file":
		default:
			return resolveActiveFile(app, viewerLeaf);
	}
}
