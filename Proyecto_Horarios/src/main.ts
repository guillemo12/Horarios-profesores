declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

const { invoke } = window.__TAURI__?.core || {};

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

async function greet(): Promise<void> {
  if (!invoke || !greetInputEl || !greetMsgEl) return;
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsgEl.textContent = await invoke<string>("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector<HTMLFormElement>("#greet-form")?.addEventListener("submit", (e: SubmitEvent) => {
    e.preventDefault();
    greet();
  });
});
