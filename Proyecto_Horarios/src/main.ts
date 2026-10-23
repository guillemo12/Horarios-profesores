export interface TauriInvokeArgs {
  name: string;
}

export interface TauriCore {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

declare global {
  interface Window {
    __TAURI__?: {
      core: TauriCore;
    };
  }
}

export async function greet(
  inputEl: HTMLInputElement | null,
  msgEl: HTMLElement | null,
  customInvoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
): Promise<string> {
  const name = inputEl?.value?.trim() || "";
  const tauriInvoke = typeof window !== "undefined" ? window.__TAURI__?.core?.invoke : undefined;
  const invokeFn = customInvoke || tauriInvoke;

  if (!invokeFn) {
    const errorMsg = "Tauri API no está disponible en este entorno";
    if (msgEl) msgEl.textContent = errorMsg;
    return errorMsg;
  }

  try {
    const result = (await invokeFn("greet", { name })) as string;
    if (msgEl) msgEl.textContent = result;
    return result;
  } catch (error) {
    const errorMsg = `Error al invocar saludo: ${error instanceof Error ? error.message : String(error)}`;
    if (msgEl) msgEl.textContent = errorMsg;
    return errorMsg;
  }
}

export function initTauriApp(): void {
  const greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  const greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  const greetFormEl = document.querySelector<HTMLFormElement>("#greet-form");

  greetFormEl?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet(greetInputEl, greetMsgEl);
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initTauriApp();
  });
}
