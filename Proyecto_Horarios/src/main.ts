declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<string>;
      };
    };
  }
}

export let greetInputEl: HTMLInputElement | null = null;
export let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<string> {
  const tauriCore = window.__TAURI__?.core;
  if (!tauriCore) {
    const fallbackMsg = `Hello, ${greetInputEl?.value || 'World'}! (Fallback)`;
    if (greetMsgEl) {
      greetMsgEl.textContent = fallbackMsg;
    }
    return fallbackMsg;
  }

  const name = greetInputEl ? greetInputEl.value : "";
  const result = await tauriCore.invoke("greet", { name });
  if (greetMsgEl) {
    greetMsgEl.textContent = result;
  }
  return result;
}

export function initEventListeners(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const form = document.querySelector<HTMLFormElement>("#greet-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      greet();
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
  });
}
