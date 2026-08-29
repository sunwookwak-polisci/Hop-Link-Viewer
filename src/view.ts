import { ItemView, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import type HopLinkViewerPlugin from "../main";
import { VIEW_TYPE_HOP_LINK_VIEWER } from "./constants";
import { resolveAnchor } from "./anchor";
import { hopSuggestions } from "./graph";

function formatModifiedTime(timestamp: number): string {
	const date = new Date(timestamp);
	const pad = (value: number): string => String(value).padStart(2, "0");
	return [
		String(date.getFullYear()),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
	].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export class HopLinkViewerView extends ItemView {
	plugin: HopLinkViewerPlugin;
	private linkedGroup: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: HopLinkViewerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_HOP_LINK_VIEWER;
	}

	getDisplayText(): string {
		return "Hop-Link Viewer";
	}

	getIcon(): string {
		return "git-branch";
	}

	onOpen(): Promise<void> {
		this.contentEl.addClass("hop-link-viewer-view");
		this.registerEvent(
			this.leaf.on("group-change", (group) => {
				this.linkedGroup = group || null;
				this.render();
			})
		);
		this.registerLinkHandlers();
		this.registerHopControls();
		this.render();
		return Promise.resolve();
	}

	async onClose(): Promise<void> {
		// cleanup handled by registerEvent in plugin
	}

	private registerHopControls(): void {
		this.registerDomEvent(this.contentEl, "click", (evt) => {
			const button = (evt.target as HTMLElement).closest<HTMLButtonElement>(
				".hop-link-viewer-hop-btn"
			);
			if (!button) return;
			evt.preventDefault();
			const action = button.dataset.action;
			if (action === "decrease") {
				void this.setHops(this.plugin.settings.hops - 1);
			} else if (action === "increase") {
				void this.setHops(this.plugin.settings.hops + 1);
			}
		});

		this.registerDomEvent(this.contentEl, "change", (evt) => {
			const input = (evt.target as HTMLElement).closest<HTMLInputElement>(
				".hop-link-viewer-hop-input"
			);
			if (!input) return;
			const parsed = parseInt(input.value, 10);
			if (!isNaN(parsed)) {
				void this.setHops(parsed);
			} else {
				this.render();
			}
		});
	}

	private async setHops(hops: number): Promise<void> {
		const clamped = Math.max(1, hops);
		if (clamped === this.plugin.settings.hops) {
			this.render();
			return;
		}
		this.plugin.settings.hops = clamped;
		await this.plugin.saveSettings();
		this.render();
	}

	private registerLinkHandlers(): void {
		const openFromLink = (evt: MouseEvent, newTab: boolean): void => {
			const target = (evt.target as HTMLElement).closest("a.internal-link");
			if (!(target instanceof HTMLAnchorElement)) return;
			const path = target.dataset.href;
			if (!path) return;
			evt.preventDefault();
			void this.app.workspace.openLinkText(path, "", newTab);
		};

		this.registerDomEvent(this.contentEl, "click", (evt) => {
			openFromLink(evt, evt.ctrlKey || evt.metaKey);
		});

		this.registerDomEvent(this.contentEl, "auxclick", (evt) => {
			if (evt.button === 1) {
				openFromLink(evt, true);
			}
		});
	}

	render(): void {
		const container = this.contentEl;
		container.empty();

		const hops = this.plugin.settings.hops;
		const includeDirect = this.plugin.settings.includeDirectLinks;

		const hopSetting = container.createDiv({ cls: "hop-link-viewer-hop-setting" });
		hopSetting.createSpan({ text: "Up to " });

		const hopControl = hopSetting.createDiv({ cls: "hop-link-viewer-hop-control" });
		hopControl.createEl("button", {
			cls: "hop-link-viewer-hop-btn",
			text: "−",
			attr: { type: "button", "data-action": "decrease", "aria-label": "Decrease hop depth" },
		});
		hopControl.createEl("input", {
			cls: "hop-link-viewer-hop-input",
			attr: { type: "number", min: "1", value: String(hops), "aria-label": "Hop depth" },
		});
		hopControl.createEl("button", {
			cls: "hop-link-viewer-hop-btn",
			text: "+",
			attr: { type: "button", "data-action": "increase", "aria-label": "Increase hop depth" },
		});

		hopSetting.createSpan({
			text: includeDirect ? "-hop link suggestions" : "-hop missing links",
		});

		const anchor = this.resolveLinkedAnchor() ?? resolveAnchor(
			this.app,
			this.plugin.settings,
			this.plugin.lastEditedPath,
			this.leaf
		);

		if (!anchor) {
			container.createEl("p", {
				cls: "hop-link-viewer-empty",
				text: "No anchor note found.",
			});
			return;
		}

		const anchorSection = container.createDiv({ cls: "hop-link-viewer-anchor" });
		anchorSection.createSpan({ text: "Anchor: " });

		const anchorLink = anchorSection.createEl("a", {
			cls: "internal-link",
			text: anchor.basename,
			href: anchor.path,
		});
		anchorLink.dataset.href = anchor.path;

		anchorSection.createSpan({
			cls: "hop-link-viewer-mtime",
			text: ` · modified ${formatModifiedTime(anchor.stat.mtime)}`,
		});

		const suggestions = hopSuggestions(this.app, anchor.path, this.plugin.settings);

		if (suggestions.length > 0) {
			const list = container.createEl("ul", { cls: "hop-link-viewer-list" });
			for (const suggestion of suggestions) {
				const item = list.createEl("li");
				const file = this.app.vault.getAbstractFileByPath(suggestion.path);
				const displayName = file instanceof TFile ? file.basename : suggestion.path;

				if (suggestion.isDirectLink) {
					item.createSpan({
						cls: "hop-link-viewer-connected",
						text: "linked",
						attr: { title: "Already linked to anchor" },
					});
				}

				const link = item.createEl("a", {
					cls: "internal-link",
					text: displayName,
					href: suggestion.path,
				});
				link.dataset.href = suggestion.path;

				if (!suggestion.isDirectLink) {
					item.createSpan({
						cls: "hop-link-viewer-hop-level",
						text: String(suggestion.hop),
						attr: { title: `${String(suggestion.hop)}-hop from anchor` },
					});
				}
			}
		} else {
			container.createEl("p", {
				cls: "hop-link-viewer-empty",
				text: includeDirect
					? `No ${String(hops)}-hop suggestions yet.`
					: `No missing ${String(hops)}-hop network links predicted yet.`,
			});
		}
	}

	private resolveLinkedAnchor(): TFile | null {
		if (this.plugin.settings.anchorMode !== "active-file") return null;

		const stateGroupMember = this.leaf.getViewState().group;
		const stateGroupFile = this.getMarkdownFile(stateGroupMember);
		if (stateGroupFile) return stateGroupFile;

		if (!this.linkedGroup) return null;
		for (const leaf of this.app.workspace.getGroupLeaves(this.linkedGroup)) {
			if (leaf === this.leaf) continue;
			const file = this.getMarkdownFile(leaf);
			if (file) return file;
		}

		return null;
	}

	private getMarkdownFile(leaf: WorkspaceLeaf | undefined): TFile | null {
		if (!leaf) return null;
		if (leaf.view instanceof MarkdownView) {
			const file = leaf.view.file;
			if (file instanceof TFile && file.extension === "md") return file;
		}

		const filePath = leaf.getViewState().state?.file;
		if (typeof filePath !== "string") return null;
		const file = this.app.vault.getAbstractFileByPath(filePath);
		return file instanceof TFile && file.extension === "md" ? file : null;
	}
}
