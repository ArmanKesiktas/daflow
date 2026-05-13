import { Composition } from 'remotion'
import { DaflowPromo } from './DaflowPromo'

export function RemotionRoot() {
  return (
    <Composition
      id="DaflowPromo"
      component={DaflowPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}
