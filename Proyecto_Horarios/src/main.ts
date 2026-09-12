interface TauriCore {
  invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

interface WindowWithTauri extends Window {
  __TAURI__?: {
    core: TauriCore;
  };
}

declare const window: WindowWithTauri;

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const invoke = window.__TAURI__?.core?.invoke;
  if (invoke) {
    const response = await invoke<string>("greet", { name: greetInputEl.value });
    greetMsgEl.textContent = response;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
});
