import { html } from "lit";

export type ClawhubProps = {
  // Pass any required props
};

export function renderClawhub(props: ClawhubProps) {
  return html`
    <section class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; height: 100%;">
      <iframe src="/clawhub/index.html" style="width: 100%; height: 100%; border: none; min-height: 80vh;" title="ClawHub"></iframe>
    </section>
  `;
}