declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export type TauriInvoker = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

export async function greetUser(
  name: string,
  invoker?: TauriInvoker
): Promise<string> {
  const cleanName = (name || "").trim();
  if (!cleanName) {
    return "Hola, visitante silencioso";
  }

  const doInvoke = invoker || (typeof window !== "undefined" ? window.__TAURI__?.core?.invoke : undefined);
  if (!doInvoke) {
    return `Hola, ${cleanName}! (Modo Offline)`;
  }

  try {
    const response = await doInvoke("greet", { name: cleanName });
    return String(response);
  } catch (error) {
    return `Error al saludar a ${cleanName}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function handleGreetSubmit(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const message = await greetUser(greetInputEl.value);
  greetMsgEl.textContent = message;
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
    greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
    const form = document.querySelector("#greet-form");
    if (form) {
      form.addEventListener("submit", (e: Event) => {
        e.preventDefault();
        handleGreetSubmit();
      });
    }
  });
}
