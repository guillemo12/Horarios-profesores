declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<any>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const invoke = window.__TAURI__?.core?.invoke;
  if (invoke) {
    greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const greetForm = document.querySelector("#greet-form");
  greetForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    greet();
  });
});
