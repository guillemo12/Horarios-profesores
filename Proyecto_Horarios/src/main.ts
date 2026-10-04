declare global {
  interface Window {
    __TAURI__: {
      core: {
        invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetMsgEl || !greetInputEl) return;
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  const response = await window.__TAURI__.core.invoke<string>("greet", {
    name: greetInputEl.value,
  });
  greetMsgEl.textContent = response;
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
});
