declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export let greetInputEl: HTMLInputElement | null = null;
export let greetMsgEl: HTMLElement | null = null;

export async function greet(inputEl?: HTMLInputElement | null, msgEl?: HTMLElement | null): Promise<string> {
  const targetInput = inputEl ?? greetInputEl;
  const targetMsg = msgEl ?? greetMsgEl;

  const name = targetInput?.value ?? "";
  let greeting = "";

  if (window.__TAURI__?.core) {
    greeting = await window.__TAURI__.core.invoke<string>("greet", { name });
  } else {
    greeting = `Hello, ${name}! You've been greeted from JavaScript!`;
  }

  if (targetMsg) {
    targetMsg.textContent = greeting;
  }

  return greeting;
}

export function initTauriApp(doc: Document = document): void {
  greetInputEl = doc.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = doc.querySelector<HTMLElement>("#greet-msg");

  const greetForm = doc.querySelector<HTMLFormElement>("#greet-form");
  if (greetForm) {
    greetForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      void greet();
    });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initTauriApp();
  });
}
