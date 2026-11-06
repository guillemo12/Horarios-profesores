declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = any>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(
  inputElement: HTMLInputElement | null = greetInputEl,
  msgElement: HTMLElement | null = greetMsgEl,
  invokeFn?: (cmd: string, args?: Record<string, unknown>) => Promise<any>
): Promise<string> {
  const name = inputElement?.value ?? "";
  const invoker = invokeFn || (typeof window !== "undefined" ? window.__TAURI__?.core?.invoke : undefined);

  if (!invoker) {
    const fallbackMsg = `Hello, ${name}! You've been greeted from JavaScript (fallback)!`;
    if (msgElement) {
      msgElement.textContent = fallbackMsg;
    }
    return fallbackMsg;
  }

  const response = await invoker("greet", { name });
  const resultText = String(response);
  if (msgElement) {
    msgElement.textContent = resultText;
  }
  return resultText;
}

if (typeof window !== "undefined") {
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
}
