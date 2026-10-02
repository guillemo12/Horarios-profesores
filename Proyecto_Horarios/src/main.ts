declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

export type InvokeFunction = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

/**
 * Invoca el comando de saludo de Tauri o la función de invocación proveída.
 * @param name Nombre a saludar.
 * @param customInvoke Función de invocación personalizada opcional para testing.
 * @returns Promesa con el mensaje de saludo devuelto.
 */
export async function greet(
  name: string,
  customInvoke?: InvokeFunction
): Promise<string> {
  const safeName = (name ?? "").trim();

  if (customInvoke) {
    return await customInvoke<string>("greet", { name: safeName });
  }

  const tauriCore = typeof window !== "undefined" ? window.__TAURI__?.core : undefined;
  if (tauriCore) {
    return await tauriCore.invoke<string>("greet", { name: safeName });
  }

  return `Hello, ${safeName}!`;
}

/**
 * Maneja el evento de envío del formulario de saludo.
 */
export async function handleGreetSubmit(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const greeting = await greet(greetInputEl.value);
  greetMsgEl.textContent = greeting;
}

/**
 * Inicializa los listeners y referencias a elementos del DOM.
 */
export function initApp(): void {
  if (typeof document === "undefined") return;

  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const greetForm = document.querySelector<HTMLFormElement>("#greet-form");
  if (greetForm) {
    greetForm.addEventListener("submit", (event: Event) => {
      event.preventDefault();
      handleGreetSubmit();
    });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
}
