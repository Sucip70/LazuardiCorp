import { JsonRenderer } from '../renderer'
import {
  heroSectionExample,
  heroSectionWithEventsExample,
} from '../renderer/examples'
import {
  pricingCardExample,
  registerExampleCustomComponents,
} from '../renderer/customComponents.example'

registerExampleCustomComponents()

export default function RendererDemoPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">JSON Renderer Demo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Nested JSON trees are normalized once, then rendered recursively from a flat node map.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Hero (props.onClick string)
        </h2>
        <JsonRenderer input={heroSectionExample} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Hero (events object)
        </h2>
        <JsonRenderer input={heroSectionWithEventsExample} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Custom PricingCard
        </h2>
        <JsonRenderer input={pricingCardExample} />
      </section>
    </main>
  )
}
