declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const invoke = window.__TAURI__?.core?.invoke;
  if (invoke) {
    greetMsgEl.textContent = await invoke<string>("greet", { name: greetInputEl.value });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    greet();
  });
});
