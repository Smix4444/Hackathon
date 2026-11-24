import { Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

import { Button } from '../ui/Button'

/** S1: scan om in te vallen. */
export function QrCard({ slug }: { slug: string }) {
  const url = `${window.location.origin}/s/${slug}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link gekopieerd')
    } catch {
      toast.error('Kopiëren lukte niet. Selecteer de link en kopieer ze zelf.')
    }
  }

  return (
    <section aria-labelledby="qr-kop" className="flex flex-col gap-3">
      <h2 id="qr-kop" className="text-lg">
        Scan om in te vallen
      </h2>
      <div className="w-fit rounded-block border border-line p-4">
        <QRCodeSVG value={url} size={148} bgColor="#FFFFFF" fgColor="#0E1B3D" level="M" />
      </div>
      <p className="break-all text-sm text-ink-soft">{url}</p>
      <div>
        <Button variant="secondary" onClick={copy}>
          <Copy aria-hidden="true" className="size-4" />
          Link kopiëren
        </Button>
      </div>
    </section>
  )
}
