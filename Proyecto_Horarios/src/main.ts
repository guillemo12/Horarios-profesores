declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

const { invoke } = window.__TAURI__?.core || {
  invoke: async () => ""
};

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsgEl.textContent = await invoke<string>("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  const greetFormEl = document.querySelector<HTMLFormElement>("#greet-form");

  greetFormEl?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
});
