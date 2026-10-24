declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (!greetMsgEl || !greetInputEl) return;
  const invoke = window.__TAURI__?.core.invoke;
  if (invoke) {
    const response = await invoke("greet", { name: greetInputEl.value });
    greetMsgEl.textContent = String(response);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  const form = document.querySelector("#greet-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      greet();
    });
  }
});
