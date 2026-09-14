interface TauriCore {
  invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

interface CustomWindow extends Window {
  __TAURI__?: {
    core: TauriCore;
  };
}

declare const window: CustomWindow;

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const tauriCore = window.__TAURI__?.core;
  if (tauriCore) {
    greetMsgEl.textContent = await tauriCore.invoke<string>("greet", { name: greetInputEl.value });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const form = document.querySelector<HTMLFormElement>("#greet-form");
  if (form) {
    form.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      greet();
    });
  }
});
