import { html, nothing } from "lit";
import { clampText } from "../format";

export type SkillhubEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  installed: boolean;
};

export type SkillhubProps = {
  loading: boolean;
  skills: SkillhubEntry[];
  error: string | null;
  filter: string;
  busyKey: string | null;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onInstall: (skillId: string) => void;
};

export function renderSkillhub(props: SkillhubProps) {
  const filter = props.filter.trim().toLowerCase();
  const filtered = filter
    ? props.skills.filter((skill) =>
        [skill.name, skill.description, skill.category]
          .join(" ")
          .toLowerCase()
          .includes(filter),
      )
    : props.skills;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">Skillhub</div>
          <div class="card-sub">Discover and install skills from the marketplace.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>Filter</span>
          <input
            .value=${props.filter}
            @input=${(e: Event) =>
              props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="Search skills"
          />
        </label>
        <div class="muted">${filtered.length} shown</div>
      </div>

      ${props.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
        : nothing}

      ${filtered.length === 0
        ? html`<div class="muted" style="margin-top: 16px;">No skills found.</div>`
        : html`
            <div class="list" style="margin-top: 16px;">
              ${filtered.map((skill) => renderSkillhubEntry(skill, props))}
            </div>
          `}
    </section>
  `;
}

function renderSkillhubEntry(skill: SkillhubEntry, props: SkillhubProps) {
  const busy = props.busyKey === skill.id;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${skill.name}
        </div>
        <div class="list-sub">${clampText(skill.description, 140)}</div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip chip-ok">${skill.category}</span>
        </div>
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; flex-wrap: wrap;">
          ${skill.installed
            ? html`<button class="btn" disabled>Installed</button>`
            : html`<button
                class="btn primary"
                ?disabled=${busy}
                @click=${() => props.onInstall(skill.id)}
              >
                ${busy ? "Installing…" : "Install"}
              </button>`}
        </div>
      </div>
    </div>
  `;
}
