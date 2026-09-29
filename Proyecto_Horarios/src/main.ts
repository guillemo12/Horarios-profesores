export interface WindowWithTauri extends Window {
  __TAURI__?: {
    core?: {
      invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  };
}

declare const window: WindowWithTauri;

/**
 * Invoca la orden 'greet' de Tauri o genera una respuesta por defecto si Tauri no está presente.
 */
export async function greetUser(
  name: string,
  invokeFn?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
): Promise<string> {
  const safeName = name?.trim() ?? "";

  if (invokeFn) {
    return (await invokeFn("greet", { name: safeName })) as string;
  }

  if (typeof window !== "undefined") {
    const invoke = window.__TAURI__?.core?.invoke;
    if (typeof invoke === "function") {
      return (await invoke("greet", { name: safeName })) as string;
    }
  }

  return `Hello, ${safeName || "Guest"}!`;
}

/**
 * Vincula el evento submit del formulario de saludo en el DOM especificado.
 */
export function setupGreetHandler(doc: Document = document): void {
  const greetInputEl = doc.querySelector<HTMLInputElement>("#greet-input");
  const greetMsgEl = doc.querySelector<HTMLElement>("#greet-msg");
  const greetFormEl = doc.querySelector<HTMLFormElement>("#greet-form");

  if (!greetFormEl || !greetInputEl || !greetMsgEl) {
    return;
  }

  greetFormEl.addEventListener("submit", async (e: Event) => {
    e.preventDefault();
    const name = greetInputEl.value;
    const responseMsg = await greetUser(name);
    greetMsgEl.textContent = responseMsg;
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    setupGreetHandler();
  });
}
