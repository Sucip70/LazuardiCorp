-- Seed built-in component catalog (matches frontend component-library)

BEGIN;

INSERT INTO components (name, category, accepts_children, default_props, default_styles) VALUES
  ('Container',  'layout',       TRUE,  '{"tag":"div","maxWidth":"lg","gap":"md","padding":"md"}', '{"className":"mx-auto w-full max-w-5xl"}'),
  ('Row',        'layout',       TRUE,  '{"gap":"md","align":"stretch","justify":"start","wrap":false}', '{"className":"flex w-full flex-row gap-4"}'),
  ('Column',     'layout',       TRUE,  '{"gap":"md","align":"stretch","justify":"start"}', '{"className":"flex w-full flex-col gap-4"}'),
  ('Section',    'layout',       TRUE,  '{"title":"","subtitle":""}', '{"className":"py-8"}'),
  ('Heading',    'typography',   FALSE, '{"text":"Heading","level":2}', '{"className":"text-2xl font-bold text-gray-900"}'),
  ('Paragraph',  'typography',   FALSE, '{"text":"Paragraph text","size":"base"}', '{"className":"text-base text-gray-700"}'),
  ('Span',       'typography',   FALSE, '{"text":"Span"}', '{"className":"text-base"}'),
  ('Image',      'media',        FALSE, '{"src":"","alt":"","objectFit":"cover"}', '{"className":"max-w-full object-cover"}'),
  ('Video',      'media',        FALSE, '{"src":"","controls":true}', '{"className":"w-full"}'),
  ('Icon',       'media',        FALSE, '{"name":"info","label":"Icon","size":"md"}', '{"className":"inline-flex"}'),
  ('Button',     'interactive',  FALSE, '{"label":"Button","variant":"primary","size":"md","type":"button"}', '{"className":"rounded-lg px-4 py-2 font-medium"}'),
  ('Link',       'navigation',   TRUE,  '{"label":"Link","href":"/","target":"_self"}', '{"className":"text-blue-600 underline"}'),
  ('Accordion',  'interactive',  FALSE, '{"items":[],"allowMultiple":false}', '{"className":"divide-y divide-gray-200"}'),
  ('Tabs',       'interactive',  TRUE,  '{"items":[],"activeTabId":"","orientation":"horizontal"}', '{"className":""}'),
  ('Input',      'forms',        FALSE, '{"label":"Label","name":"field","inputType":"text","required":false}', '{"className":""}'),
  ('TextArea',   'forms',        FALSE, '{"label":"Label","name":"field","rows":4}', '{"className":""}'),
  ('Select',     'forms',        FALSE, '{"label":"Label","name":"field","options":[]}', '{"className":""}'),
  ('Checkbox',   'forms',        FALSE, '{"label":"Checkbox","name":"checkbox","checked":false}', '{"className":""}'),
  ('Radio',      'forms',        FALSE, '{"legend":"Choose one","name":"radio","options":[]}', '{"className":""}'),
  ('Form',       'forms',        TRUE,  '{"method":"post","action":""}', '{"className":"flex flex-col gap-3"}'),
  ('Navbar',     'navigation',   TRUE,  '{"brand":"Brand","brandHref":"/","links":[],"sticky":false}', '{"className":"border-b bg-white"}'),
  ('Menu',       'navigation',   FALSE, '{"label":"Menu","items":[],"orientation":"horizontal"}', '{"className":""}'),
  ('Breadcrumb', 'navigation',   FALSE, '{"items":[],"ariaLabel":"Breadcrumb"}', '{"className":"text-sm text-gray-500"}'),
  ('Alert',      'feedback',     FALSE, '{"title":"","message":"","variant":"info","dismissible":false}', '{"className":"rounded-lg border p-4"}'),
  ('Modal',      'feedback',     TRUE,  '{"title":"Modal","description":"","open":true}', '{"className":""}'),
  ('Toast',      'feedback',     FALSE, '{"message":"","variant":"info","visible":true}', '{"className":"rounded-lg border p-4"}'),
  ('Text',       'typography',   FALSE, '{"content":"Text","as":"p"}', '{"className":"text-base text-gray-800"}');

COMMIT;
