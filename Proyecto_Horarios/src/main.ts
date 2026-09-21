declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<any>;
      };
    };
  }
}

const invoke = window.__TAURI__?.core.invoke;

let greetInputEl: HTMLInputElement | null;
let greetMsgEl: HTMLElement | null;

async function greet(): Promise<void> {
  if (!greetMsgEl || !greetInputEl) return;
  if (invoke) {
    greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    greet();
  });
});
