declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  if (window.__TAURI__?.core && greetInputEl && greetMsgEl) {
    greetMsgEl.textContent = await window.__TAURI__.core.invoke<string>("greet", {
      name: greetInputEl.value,
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const formEl = document.querySelector<HTMLFormElement>("#greet-form");
  if (formEl) {
    formEl.addEventListener("submit", (e: SubmitEvent) => {
      e.preventDefault();
      greet();
    });
  }
});
