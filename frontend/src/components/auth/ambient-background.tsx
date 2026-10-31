/**
 * Decorative ambient background featuring soft radial glow gradients
 * and a tactile paper grain overlay.
 *
 * Supports mirrored placement to create visual balance between
 * the Sign-Up and Login page compositions.
 */
interface AmbientBackgroundProps {
  mirrored?: boolean;
}

export function AmbientBackground({ mirrored = false }: AmbientBackgroundProps) {
  return (
    <>
      <div className="paper-grain" aria-hidden="true" />
      {mirrored ? (
        <>
          {/* Mirrored layout: Sky Blue on top-left, Lavender on bottom-right */}
          <div
            className="pointer-events-none absolute -top-32 -left-20 size-[750px] rounded-full glow-sky blur-3xl opacity-75 dark:opacity-20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-40 -right-20 size-[800px] rounded-full glow-lavender blur-3xl opacity-70 dark:opacity-20"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-[45%] left-[28%] size-[600px] rounded-full glow-aqua blur-3xl opacity-50 dark:opacity-15"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          {/* Default layout: Sky Blue on top-right, Lavender on bottom-left */}
          <div className="glow-sky" aria-hidden="true" />
          <div className="glow-lavender" aria-hidden="true" />
          <div className="glow-aqua" aria-hidden="true" />
        </>
      )}
    </>
  );
}
