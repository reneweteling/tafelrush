// Compile-time check that every browser file (*.web.ts) offers what its phone
// version offers. Metro picks the .web.ts file for the browser, but TypeScript only
// ever sees the phone version through imports, so a missing export would only show
// up as a crash in the browser. Type-only: nothing here ends up in a bundle.

import type * as analytics from './analytics'
import type * as analyticsWeb from './analytics.web'
import type * as awake from './awake'
import type * as awakeWeb from './awake.web'
import type * as buzz from './buzz'
import type * as buzzWeb from './buzz.web'
import type * as keys from './keys'
import type * as keysWeb from './keys.web'
import type * as listen from './listen'
import type * as listenWeb from './listen.web'
import type * as share from './share'
import type * as shareWeb from './share.web'
import type * as voice from './voice'
import type * as voiceWeb from './voice.web'

type Covers<Web, Native> = { [K in keyof Native]: K extends keyof Web ? true : false }[keyof Native]
type Assert<T extends true> = T

export type PlatformParity = [
  Assert<Covers<typeof analyticsWeb, typeof analytics>>,
  Assert<Covers<typeof awakeWeb, typeof awake>>,
  Assert<Covers<typeof buzzWeb, typeof buzz>>,
  Assert<Covers<typeof keysWeb, typeof keys>>,
  Assert<Covers<typeof listenWeb, typeof listen>>,
  Assert<Covers<typeof shareWeb, typeof share>>,
  Assert<Covers<typeof voiceWeb, typeof voice>>,
]
