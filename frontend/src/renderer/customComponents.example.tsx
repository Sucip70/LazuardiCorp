import { PricingCard } from './components/PricingCard'
import { registerCustomComponent } from './registry'

export function registerExampleCustomComponents() {
  registerCustomComponent('PricingCard', PricingCard, { acceptsChildren: true })
}

export const pricingCardExample = {
  id: 'pricing-card',
  type: 'PricingCard',
  props: {
    title: 'Pro',
    price: '$29/mo',
    description: 'For growing teams',
    className: 'max-w-sm',
  },
  children: [
    {
      type: 'Button',
      props: {
        text: 'Choose Pro',
        className: 'mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white',
        onClick: 'handleClick',
      },
    },
  ],
}
