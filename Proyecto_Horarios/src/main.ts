interface WindowWithTauri extends Window {
  __TAURI__?: {
    core: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  };
}

declare const window: WindowWithTauri;

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

async function greet(): Promise<void> {
  if (greetMsgEl && greetInputEl && window.__TAURI__?.core) {
    greetMsgEl.textContent = await window.__TAURI__.core.invoke<string>("greet", {
      name: greetInputEl.value,
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const greetForm = document.querySelector<HTMLFormElement>("#greet-form");
  if (greetForm) {
    greetForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      greet();
    });
  }
});
