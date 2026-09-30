interface TauriCore {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
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
  if (!greetInputEl || !greetMsgEl || !window.__TAURI__?.core) return;
  const name = greetInputEl.value;
  greetMsgEl.textContent = await window.__TAURI__.core.invoke<string>("greet", { name });
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
});
