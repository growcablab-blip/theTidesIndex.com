/**
 * Whether an unpublished record may be rendered at its public route.
 *
 * Kept in its own module, free of `server-only`, so the condition that keeps
 * unreviewed medical content off the public site can be tested directly rather
 * than reasoned about. Two independent conditions, neither sufficient alone:
 * the build must not be a production build, and the preview must be switched on
 * explicitly.
 */

export interface PreviewEnv {
  readonly nodeEnv: string | undefined;
  readonly flag: string | undefined;
}

export function currentPreviewEnv(): PreviewEnv {
  return {
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.TIDES_PREVIEW_UNPUBLISHED,
  };
}

export function previewAllowed(env: PreviewEnv): boolean {
  return env.nodeEnv !== 'production' && env.flag === '1';
}

/** Why the preview is unavailable, for a development-time message. */
export function previewRefusal(env: PreviewEnv): string | null {
  if (env.nodeEnv === 'production') {
    return 'Unpublished previews are not available in a production build.';
  }
  if (env.flag !== '1') {
    return 'Set TIDES_PREVIEW_UNPUBLISHED=1 to preview unpublished records locally.';
  }
  return null;
}
