import type { GatewayBrowserClient } from "../gateway.js";
import type { HubSearchReport } from "../types.js";

export type HubState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  hubLoading: boolean;
  hubReport: HubSearchReport | null;
  hubError: string | null;
  hubBusyKey: string | null;
  hubSearchQuery: string;
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function searchHub(state: HubState) {
  if (!state.client || !state.connected) return;
  if (state.hubLoading) return;
  state.hubLoading = true;
  state.hubError = null;
  try {
    const res = (await state.client.request("hub.search", {
      query: state.hubSearchQuery,
    })) as HubSearchReport | undefined;
    if (res) state.hubReport = res;
  } catch (err) {
    state.hubError = getErrorMessage(err);
  } finally {
    state.hubLoading = false;
  }
}

export async function installHubSkill(
  state: HubState,
  slug: string,
) {
  if (!state.client || !state.connected) return;
  state.hubBusyKey = slug;
  state.hubError = null;
  try {
    const res = await state.client.request("hub.install", { slug }) as any;
    if (res?.message) {
        state.hubError = res.message; // Use error field for displaying success message in UI temporarily since no toast exists
    }
  } catch (err) {
    state.hubError = getErrorMessage(err);
  } finally {
    state.hubBusyKey = null;
  }
}

export async function testHubSkill(
  state: HubState,
  slug: string,
) {
  if (!state.client || !state.connected) return;
  state.hubBusyKey = slug;
  state.hubError = null;
  try {
    const res = await state.client.request("hub.test", { slug }) as any;
    if (res?.message) {
        state.hubError = res.message;
    }
  } catch (err) {
    state.hubError = getErrorMessage(err);
  } finally {
    state.hubBusyKey = null;
  }
}
