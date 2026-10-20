declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export function sanitizeGreetName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim();
}

export async function greet(
  inputEl: HTMLInputElement | null = greetInputEl,
  msgEl: HTMLElement | null = greetMsgEl,
  invoker?: (cmd: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<string> {
  const rawName = inputEl?.value ?? "";
  const name = sanitizeGreetName(rawName);

  const tauriInvoke = typeof window !== "undefined" ? window.__TAURI__?.core?.invoke : undefined;
  const invokeFn = invoker ?? tauriInvoke;
  let responseMessage = "";

  if (invokeFn) {
    try {
      const result = await invokeFn("greet", { name });
      responseMessage = String(result);
    } catch (err) {
      responseMessage = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    responseMessage = name ? `Hello, ${name}!` : "Hello!";
  }

  if (msgEl) {
    msgEl.textContent = responseMessage;
  }

  return responseMessage;
}

export function initGreetForm(
  documentRef: Document | null = typeof document !== "undefined" ? document : null,
  onSubmitOverride?: (e: Event) => void
): void {
  if (!documentRef) return;
  greetInputEl = documentRef.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = documentRef.querySelector<HTMLElement>("#greet-msg");
  const formEl = documentRef.querySelector<HTMLFormElement>("#greet-form");

  if (formEl) {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      if (onSubmitOverride) {
        onSubmitOverride(e);
      } else {
        greet();
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initGreetForm();
  });
}
