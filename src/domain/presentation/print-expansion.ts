/**
 * Print expansion of progressive disclosure.
 *
 * Owner decision (closed): when a web section is collapsed interactively, the
 * printed or saved-as-PDF page must contain all of it. Printed material never
 * hides content merely because the screen uses progressive disclosure.
 *
 * The stylesheet already reveals closed `<details>` bodies in print where the
 * browser supports `::details-content`. This is the belt to that brace: on
 * `beforeprint` every closed disclosure is opened, and on `afterprint` exactly
 * the ones this opened are closed again, so the reader's screen is left as it
 * was.
 *
 * It only ever changes *open state*. Content a reading mode withholds (dosing in
 * the simple view) was never sent to the page, so there is nothing for this to
 * reveal.
 */

/** Anything with a boolean `open` — an `HTMLDetailsElement` in the browser. */
export interface Openable {
  open: boolean;
}

/**
 * Opens every closed element and returns a function that restores exactly
 * those to closed. Elements that were already open are left alone both ways.
 */
export function expandForPrint(elements: Iterable<Openable>): () => void {
  const opened: Openable[] = [];
  for (const element of elements) {
    if (!element.open) {
      element.open = true;
      opened.push(element);
    }
  }
  return () => {
    for (const element of opened) element.open = false;
  };
}
