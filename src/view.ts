import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type HopLinkViewerPlugin from "../main";
import {
	HIERARCHY_STYLE_LABELS,
	HIERARCHY_STYLE_ORDER,
	VIEW_TYPE_HOP_LINK_VIEWER,
	includeDirectLinks,
	isHierarchyStyle,
	type HierarchyStyle,
	type HopNode,
} from "./constants";
import { fileFromLeaf, resolveAnchor } from "./anchor";
import { hopWalk, sortHopNodes } from "./graph";

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
			const select = (evt.target as HTMLElement).closest<HTMLSelectElement>(
				".hop-link-viewer-style-select"
			);
			if (select) {
				if (isHierarchyStyle(select.value)) {
					void this.setHierarchyStyle(select.value);
				} else {
					this.render();
				}
				return;
			}

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

	private async setHierarchyStyle(style: HierarchyStyle): Promise<void> {
		if (style === this.plugin.settings.hierarchyStyle) {
			this.render();
			return;
		}
		this.plugin.settings.hierarchyStyle = style;
		await this.plugin.saveSettings();
		this.plugin.refreshViews();
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

	hasFocusedControl(): boolean {
		const active = this.contentEl.ownerDocument.activeElement;
		if (!(active instanceof HTMLElement) || !this.contentEl.contains(active)) {
			return false;
		}
		return active.matches(".hop-link-viewer-style-select, .hop-link-viewer-hop-input");
	}

	render(): void {
		const container = this.contentEl;
		container.empty();

		const hops = this.plugin.settings.hops;
		const includeDirect = includeDirectLinks(this.plugin.settings);
		const hierarchyStyle = this.plugin.settings.hierarchyStyle;

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

		const styleSetting = container.createDiv({ cls: "hop-link-viewer-style-setting" });
		styleSetting.createSpan({ text: "Display" });
		const styleSelect = styleSetting.createEl("select", {
			cls: "hop-link-viewer-style-select",
			attr: { "aria-label": "Display style" },
		});
		for (const style of HIERARCHY_STYLE_ORDER) {
			styleSelect.createEl("option", {
				text: HIERARCHY_STYLE_LABELS[style],
				value: style,
			});
		}
		styleSelect.value = hierarchyStyle;

		const anchor = this.resolveLinkedAnchor() ?? resolveAnchor(
			this.app,
			this.plugin.settings,
			this.plugin.lastEditedPath,
			this.leaf
		);

		if (!anchor) {
			container.createEl("p", {
				cls: "hop-link-viewer-empty",
				text: "No anchor found.",
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

		const walk = hopWalk(this.app, anchor.path, this.plugin.settings);
		const { suggestions, nodes } = walk;
		const visiblePaths = suggestions.map((item) => item.path);

		if (suggestions.length === 0) {
			container.createEl("p", {
				cls: "hop-link-viewer-empty",
				text: includeDirect
					? `No ${String(hops)}-hop suggestions yet.`
					: `No missing ${String(hops)}-hop network links predicted yet.`,
			});
			return;
		}

		if (hierarchyStyle === "chain") {
			this.renderChain(container, nodes, visiblePaths);
			return;
		}

		this.renderList(
			container,
			suggestions.slice(0, this.plugin.settings.displayCap)
		);
	}

	private renderList(
		container: HTMLElement,
		suggestions: { path: string; isDirectLink: boolean; hop: number }[]
	): void {
		const list = container.createEl("ul", { cls: "hop-link-viewer-list" });
		for (const suggestion of suggestions) {
			const item = list.createEl("li");
			this.appendSuggestionRow(item, suggestion.path, suggestion.isDirectLink, suggestion.hop);
		}
	}

	private renderChain(
		container: HTMLElement,
		nodes: Map<string, HopNode>,
		visiblePaths: string[]
	): void {
		const shown = new Set(visiblePaths);
		const roots = sortHopNodes(
			this.app,
			visiblePaths.flatMap((path) => {
				const node = nodes.get(path);
				if (!node) return [];
				const hasShownParent = node.parents.some((parent) => shown.has(parent));
				return hasShownParent ? [] : [node];
			}),
			this.plugin.settings
		).slice(0, this.plugin.settings.displayCap);

		if (roots.length === 0) return;

		const list = container.createEl("ul", { cls: "hop-link-viewer-tree" });
		const renderNode = (parentList: HTMLElement, node: HopNode, ancestors: Set<string>): void => {
			if (ancestors.has(node.path) || !shown.has(node.path)) return;

			const item = parentList.createEl("li");
			this.appendSuggestionRow(item, node.path, node.isDirectLink, node.hop);

			const nextAncestors = new Set(ancestors);
			nextAncestors.add(node.path);
			const childNodes = sortHopNodes(
				this.app,
				node.children.flatMap((childPath) => {
					if (nextAncestors.has(childPath) || !shown.has(childPath)) return [];
					const child = nodes.get(childPath);
					return child ? [child] : [];
				}),
				this.plugin.settings
			);
			if (childNodes.length === 0) return;

			const childList = item.createEl("ul", { cls: "hop-link-viewer-tree" });
			for (const child of childNodes) {
				renderNode(childList, child, nextAncestors);
			}
		};

		for (const root of roots) {
			renderNode(list, root, new Set());
		}
	}

	private appendSuggestionRow(
		item: HTMLElement,
		path: string,
		isDirectLink: boolean,
		hop: number
	): void {
		const link = item.createEl("a", {
			cls: "internal-link",
			text: this.getDisplayName(path),
			href: path,
		});
		link.dataset.href = path;

		if (isDirectLink) {
			item.createSpan({
				cls: "hop-link-viewer-connected",
				text: "linked",
				attr: { title: "Already linked to anchor" },
			});
		} else {
			item.createSpan({
				cls: "hop-link-viewer-hop-level",
				text: String(hop),
				attr: { title: `${String(hop)}-hop from anchor` },
			});
		}
	}

	private getDisplayName(path: string): string {
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? file.basename : path;
	}

	private resolveLinkedAnchor(): TFile | null {
		if (this.plugin.settings.anchorMode !== "active-file") return null;

		const stateGroupMember = this.leaf.getViewState().group;
		const stateGroupFile = fileFromLeaf(this.app, stateGroupMember);
		if (stateGroupFile) return stateGroupFile;

		if (!this.linkedGroup) return null;
		for (const leaf of this.app.workspace.getGroupLeaves(this.linkedGroup)) {
			if (leaf === this.leaf) continue;
			const file = fileFromLeaf(this.app, leaf);
			if (file) return file;
		}

		return null;
	}
}
