/** Mutable per-frame state shared between the UI timeline and the canvas scene. */
export type SceneState = {
  progress: number // 0→1 loading; drives constellation + starfield warp
  burst: number    // 0→1 arrival; releases the warp back to calm drift
  flare: number    // 0→1 condensation; constellation flares out, solid name in
  memory: number   // 0→1 post-load: hovering the name re-reveals its stars
}
