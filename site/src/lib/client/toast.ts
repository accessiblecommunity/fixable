/** @fileoverview Functions complementing the Toast component in both broken and fixed states */

import type { ToastType } from "@/components/Toast.astro";
import { getMode } from "../mode";
import type { HTMLAttributes } from "astro/types";

interface ToastOptions {
  /** If set to true, leaves HTML unescaped in the message */
  allowHtml?: boolean;
  /**
   * If set, the toast will automatically dismiss after this number of milliseconds
   * (broken mode only)
   */
  duration?: number;
  /**
   * If specified, passes the given role attribute value
   * (broken mode only, since fixed uses a non-modal dialog instead)
   */
  role?: HTMLAttributes<"div">["role"];
  /** Type of toast; determines icon placed before the message */
  type: ToastType;
  /**
   * If set to false, the toast will not include a dismiss button
   * (broken mode only)
   */
  withDismiss?: boolean;
}

interface ToastOptionsWithAction extends ToastOptions {
  actionCallback: () => void;
  actionLabel: string;
}

export function hideToast() {
  const toastEl = document.getElementById("toast")!;
  if (getMode() === "broken") toastEl.hidden = true;
  else (toastEl as HTMLDialogElement).close();
}

/**
 * Displays a message in a toast.
 * Note this does not support multiple concurrent toasts or queueing.
 */
export function showToast(
  message: string,
  {
    allowHtml,
    duration,
    role,
    type,
    withDismiss = true,
    ...actionOptions
  }: ToastOptions | ToastOptionsWithAction
) {
  const isBroken = getMode() === "broken";
  const toastEl = document.getElementById("toast")!;
  const contentEl = document.getElementById("toast-content");
  const dismissEl = document.getElementById("toast-dismiss");
  if (!toastEl || !contentEl || !dismissEl)
    throw new Error("showToast used without <Toast /> component present");

  if (allowHtml) contentEl.innerHTML = message;
  else contentEl.textContent = message;

  if (isBroken) {
    dismissEl.hidden = !withDismiss;
    if (role) toastEl.setAttribute("role", role);
    else toastEl.removeAttribute("role");
  }

  const templateEl = document.getElementById(
    `toast-icon-${type}`
  ) as HTMLTemplateElement;
  if (!templateEl)
    throw new Error(`Template element not found for type ${options.type}`);
  contentEl.insertBefore(
    templateEl.content.cloneNode(true),
    contentEl.firstChild
  );

  if ("actionCallback" in actionOptions) {
    const buttonEl = document.createElement("button");
    buttonEl.textContent = actionOptions.actionLabel;
    buttonEl.addEventListener(
      "click",
      isBroken
        ? () => {
            toastEl.hidden = true;
            actionOptions.actionCallback();
          }
        : actionOptions.actionCallback
    );
    toastEl.appendChild(buttonEl);
  }

  if (isBroken) toastEl.hidden = false;
  else (toastEl as HTMLDialogElement).show();

  if (isBroken && duration) setTimeout(hideToast, duration);
}
