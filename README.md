---
description: "Web Session hub: one timeline of every Session across every Workspace, grouped by day and searchable; it registers a global main panel plus a sidebar entry and replaces no shipped UI."
kind: "package-reference"
---

# dsh-session-hub

English | [中文](README.zh.md)

[![GitHub stars](https://img.shields.io/github/stars/20zxknk/dsh-session-hub?style=social)](https://github.com/20zxknk/dsh-session-hub/stargazers)

## Summary

A third-party DeepSeek Harness plugin that lists every Session across every Workspace on one page, ordered by day by default, with search over title and Workspace path, running and archived filters, and a per-Workspace colour that survives sorting. The shipped sidebar browses Workspaces first; this page offers the other path — locate by when, recognise by where — for installations where Workspaces and Sessions have both grown past what a grouped list can show at a glance. It registers the keyed `main` panel `session-hub` and the `sidebar.panellist` entry of the same id, reads the existing `sessions.list` and `workspaces.list` snapshots, and replaces no shipped surface.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Star this repo](#star-this-repo)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Install it into a profile and enable the bundle; the sidebar gains one icon beside the Automation tasks entry, and that icon opens the page in the main column without selecting or activating a Session.

```powershell
dsh plugin --profile desktop add github:20zxknk/dsh-session-hub
```

The page requires no configuration and registers no settings row. Its header states the Session count and the number of Workspaces those Sessions belong to, and the four-way order control beside it is the page's only mode switch: **By day** (the default), **Recent activity**, **By workspace**, and **By title**.

### The day view

**By day** groups the list under sticky local-date headings — `Today`, `Yesterday`, then a month-and-day label that gains its year once the date leaves the current year — and each row's leading cell is the local clock time of its last prompt. Rows inside a day are newest first. This is the view the plugin exists for: a Session is usually recalled as "the one from Tuesday afternoon in that project", and the day heading plus the clock column answer that without reading a single title.

**By workspace** groups under the Workspace's stored title with its full path as the group detail, in Workspace group order, and appends Sessions outside every Workspace under `No workspace`. **Recent activity** and **By title** are flat lists; **By title** sorts on the session title and falls back to recency for equal titles, so untitled Sessions collect at the end instead of scattering.

### Search and filters

The search field is a case-insensitive substring match over three values at once: the Session title, its Workspace's title, and its Workspace's stored path. Typing a directory name therefore narrows the page to that Workspace without a separate Workspace filter, and typing part of a Session id does not match, because ids never enter the page. Escape clears a non-empty query without closing the page.

Two chips filter the list: **Running** keeps only Sessions with running work, and **Include archived** adds archived Sessions, which otherwise stay hidden. Archived rows keep their position in the chosen order, render dimmed, and carry an `Archived` tag; pinned Sessions carry a `Pinned` tag and stay pinned in every order rather than leading it.

The order, both filters, and nothing else persist in browser-local storage under `dsh.session-hub.view`, so a reload restores the page as it was left. The query is deliberately not persisted: a stale filter that hides every row is worse than retyping it.

### Rows and identification

Every row is one button that opens its Session through `uiWorkspace.openSession`, and every row carries four identification values: the per-Workspace colour bar and dot, the Session title, the Workspace title, and the turn count. The colour is derived from the Workspace id by a stable hash, so one Workspace keeps one hue across reloads, across orders, and across every Session in it; the same hue tints the small dot inside the meta line, which is what makes two Sessions from different Workspaces distinguishable before their titles are read. The turn count comes from the Session's `sessionStats` projection and is omitted when that projection is absent or reports zero turns, so a fresh scratch Session does not read as a serious one.

A Session without a title renders the localized `Untitled` label in italic grey rather than an empty title line, and hovering a row shows its absolute timestamp together with the Workspace path. Sessions with `origin: 'subagent'` and unopened blank Sessions never appear: they are addressable through their parent, not as history rows.

### Paging

The page renders at most 200 rows at a time and a `Show more` action appends the next batch; the footer states how many rows remain. The limit resets whenever the order, a filter, or the query changes, so a new view never inherits the previous scroll depth.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The bundle is one browser package with a two-line Host half and no build step; `client.js` is plain JavaScript that registers a module-loader factory whose id equals the package name. The Host `apply` exists only so the row resolves.

The Client half registers two slots and injects `slots`, `locale`, `sessions`, `workspaces`, and `uiWorkspace`. `ctx.slots.inject('main', ...)` registers the keyed panel `session-hub`; `ctx.slots.inject('sidebar.panellist', ...)` registers the icon entry with the same id at `order: 20`, and the sidebar's rule that a panel id addresses the matching main key is what makes the icon navigate. Both registrations sit behind `slots.inject`, so they follow their declaring slot's lifecycle and survive a restored declaration.

Data comes from the framework's own framework-neutral snapshots — `ctx.sessions.list` and `ctx.workspaces.list` — which the inject face turns into selector hooks over `useSyncExternalStore`. The panel prefers the surface's standard `useSessions` and `useWorkspaces` props when a host supplies them and falls back to those injected hooks otherwise, and it reads the standard `useSessionStatus` hook for live running state, falling back to the summary's own `running` flag when the surface carries no status hook. No own store, polling, or cache exists: every figure the page shows is a pure projection of a snapshot the sidebar already reads, and a Session the sidebar lists costs the page nothing extra.

Rendering is a memoized row projection followed by a section projection. Rows are built once per snapshot or filter change, filtered and sorted in one pass, and grouped afterwards; the row component itself holds no state beyond its props, so a clock tick re-renders labels and re-groups headings without rebuilding the row model. The page keeps one `setInterval` that advances a "now" value every 60 seconds for the relative labels in the flat orders, and the day headings recompute from the same value, so a page left open across midnight re-labels itself without a reload. Search, order, and filter state live in `useState`; only the three view choices reach `localStorage`.

The page owns an error boundary. A render fault in this page renders one localized sentence and logs to the console, leaving the slot occupied instead of blanking the main column.

Copy goes through the Client locale service under the `sessionhub` namespace, with complete `en` and `zh` dictionaries; the sidebar label is a thunk that re-reads the active locale on every projection. Styling uses only `--dsw-alias-*` theme tokens, so the page follows light and dark themes without its own overrides, and the per-Workspace hue is the one generated value, chosen for a mid lightness that stays legible against both backgrounds.

</details>

-----

<a id="model-experience"></a>
## Model Experience

None. The plugin registers no tool, command, prompt section, or session event, and never appends to a Session log; it reads the List projections a Session's owning packages already publish.

#### KV Cache effect

None. The page's data never enters a provider request.

-----

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- **No content in the list.** Rows show metadata only. Titles generated from the first prompt are truncated by the Host around 20 characters, so Sessions whose titles collide — the same prompt run repeatedly, for example — remain distinguishable only by Workspace, day, time, and turn count. A prompt excerpt would need a per-Session history read, which this plugin deliberately does not issue.
- **No Session lifecycle actions.** The page opens, orders, filters, and searches; it does not delete, archive, rename, export, or fork. Those verbs stay with the sidebar and the packages that own them.
- **No virtualization.** Rendering is batched at 200 rows rather than windowed, which keeps a few thousand Sessions responsive but is not designed for tens of thousands.
- **Archived and blank Sessions are hidden by default** and blank ones cannot be reached from this page at all.
- **The live status is running, not pending interaction.** When the surface supplies its status hook the row's dot follows the real running state; it never reports an approval or a question waiting for an answer.

-----

<a id="star-this-repo"></a>
## Star this repo

**If this page earns a place in your sidebar, [★ star dsh-session-hub](https://github.com/20zxknk/dsh-session-hub/stargazers)** — that is how the next person with forty Workspaces finds it.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Developed and exercised against DeepSeek Harness `0.2.1-rc.3` and re-verified against `0.2.1-rc.5`, on the Desktop profile. The registration and the panel's data flow are stable across those two builds; `0.2.2` is documented to change Session-projection handles for custom plugins, which this plugin does not use — it reads list snapshots only — so no migration is expected, but that build has not been tested.

The interesting constraints are the ones the shipped sidebar already solved: the list snapshot is not an ordered catalog but a snapshot plus a main-view retention flag, pinned and archived membership arrive as two id arrays rather than row fields, and a Session's Workspace must be resolved by scanning every Workspace's `sessionIds` because no row carries its owner. Those three facts decide the shape of `buildRows`, and a change to any of them is where a future refactor would start.

</details>
