import { html, nothing } from "lit";
import { clampText } from "../format.js";
import type { HubSearchReport, HubSkillEntry } from "../types.js";

export type HubProps = {
  loading: boolean;
  report: HubSearchReport | null;
  error: string | null;
  searchQuery: string;
  busyKey: string | null;
  onSearchChange: (next: string) => void;
  onSearch: () => void;
  onInstall: (slug: string) => void;
  onTest: (slug: string) => void;
};

export function renderHub(props: HubProps) {
  const skills = props.report?.skills ?? [];

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">ClawHub</div>
          <div class="card-sub">Discover and install skills from the community registry.</div>
        </div>
        <button class="btn primary" ?disabled=${props.loading} @click=${props.onSearch}>
          ${props.loading ? "Searching…" : "Search"}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>Search query</span>
          <input
            .value=${props.searchQuery}
            @input=${(e: Event) =>
              props.onSearchChange((e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter") props.onSearch();
            }}
            placeholder="Search skills by keyword or name"
          />
        </label>
        <div class="muted">${skills.length} skills found</div>
      </div>

      ${props.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
        : nothing}

      ${skills.length === 0 && !props.loading
        ? html`<div class="muted" style="margin-top: 16px;">No skills found. Try searching for something else.</div>`
        : html`
            <div class="list" style="margin-top: 16px;">
              ${skills.map((skill) => renderHubSkill(skill, props))}
            </div>
          `}
    </section>
  `;
}

function renderHubSkill(skill: HubSkillEntry, props: HubProps) {
  const busy = props.busyKey === skill.id;

  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${skill.name}
        </div>
        <div class="list-sub">${clampText(skill.description, 140)}</div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">v${skill.version}</span>
          <span class="chip">by ${skill.author}</span>
        </div>
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; flex-wrap: wrap;">
          <button
            class="btn"
            ?disabled=${busy}
            @click=${() => props.onTest(skill.id)}
          >
            Test
          </button>
          <button
            class="btn primary"
            ?disabled=${busy}
            @click=${() => props.onInstall(skill.id)}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  `;
}
