// A plain description for AI assistants (llmstxt.org). Built from the same facts as the site.

import { llmsTxt } from '@/lib/seo'

export const dynamic = 'force-static'

export function GET() {
  return new Response(llmsTxt(false), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
