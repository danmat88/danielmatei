/**
 * Stage — the single fullscreen scene everything lives in.
 * No routes, no page scroll: the experience is one viewport-sized world.
 *
 * Coming next:
 *  - loader that charges up with real asset progress
 *  - lightning stroke writing "Daniel Matei"
 *  - particle portrait (face built from dots sampled from a photo)
 *  - animated background
 */
export default function Stage() {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(ellipse at 50% 40%, #0c0c14 0%, #050508 70%)',
      }}
    >
      <span
        style={{
          fontSize: 'clamp(1.2rem, 3vw, 2rem)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          opacity: 0.5,
        }}
      >
        Daniel Matei
      </span>
    </div>
  )
}
