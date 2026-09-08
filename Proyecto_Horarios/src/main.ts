interface TauriCore {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
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
  if (!greetInputEl || !greetMsgEl || !window.__TAURI__?.core) {
    return;
  }
  const response = await window.__TAURI__.core.invoke("greet", { name: greetInputEl.value });
  greetMsgEl.textContent = String(response);
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const form = document.querySelector<HTMLFormElement>("#greet-form");
  if (form) {
    form.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      greet();
    });
  }
});
