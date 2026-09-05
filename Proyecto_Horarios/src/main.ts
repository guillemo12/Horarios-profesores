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
  if (!greetMsgEl || !greetInputEl) return;

  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  if (window.__TAURI__?.core) {
    const greeting = await window.__TAURI__.core.invoke<string>("greet", { name: greetInputEl.value });
    greetMsgEl.textContent = greeting;
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
