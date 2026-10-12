declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const tauriCore = window.__TAURI__?.core;
  if (tauriCore) {
    const response = await tauriCore.invoke<string>("greet", { name: greetInputEl.value });
    greetMsgEl.textContent = response;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  const greetForm = document.querySelector<HTMLFormElement>("#greet-form");

  greetForm?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
});
