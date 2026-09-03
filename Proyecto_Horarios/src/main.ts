interface TauriCore {
  invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare global {
  interface Window {
    __TAURI__?: {
      core: TauriCore;
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetMsgEl || !greetInputEl) return;
  const invoke = window.__TAURI__?.core?.invoke;
  if (invoke) {
    greetMsgEl.textContent = await invoke<string>("greet", { name: greetInputEl.value });
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
