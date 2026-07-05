import type { JsonTreeNode } from './types'

/** Example matching the user-provided nested JSON format. */
export const heroSectionExample: JsonTreeNode = {
  id: 'hero-section',
  type: 'Container',
  props: { className: 'bg-blue-50 p-8 flex flex-col gap-4 items-start' },
  children: [
    {
      type: 'Text',
      props: { variant: 'h1', text: 'Welcome!' },
    },
    {
      type: 'Button',
      props: {
        text: 'Get Started',
        onClick: 'handleClick',
        className: 'rounded-lg bg-blue-600 px-4 py-2 text-white',
      },
    },
  ],
}

export const heroSectionWithEventsExample: JsonTreeNode = {
  id: 'hero-section',
  type: 'Container',
  props: { className: 'bg-blue-50 p-8 flex flex-col gap-4 items-start' },
  children: [
    {
      type: 'Text',
      props: { variant: 'h1', text: 'Welcome!' },
    },
    {
      type: 'Button',
      props: { text: 'Get Started', className: 'rounded-lg bg-blue-600 px-4 py-2 text-white' },
      events: {
        onClick: {
          action: 'navigate',
          payload: { href: '/signup' },
        },
      },
    },
  ],
}
