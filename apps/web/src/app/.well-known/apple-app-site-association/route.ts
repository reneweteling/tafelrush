// iOS universal links for tafelrush.nl/d/...

import { APPLE_TEAM_ID, IOS_BUNDLE_ID } from '@tafelrush/shared'

export function GET() {
  return Response.json({
    applinks: {
      details: [{ appIDs: [`${APPLE_TEAM_ID}.${IOS_BUNDLE_ID}`], components: [{ '/': '/d/*' }] }],
    },
  })
}
