BEGIN;

DELETE FROM components WHERE name IN (
  'Container', 'Row', 'Column', 'Section', 'Heading', 'Paragraph', 'Span',
  'Image', 'Video', 'Icon', 'Button', 'Link', 'Accordion', 'Tabs',
  'Input', 'TextArea', 'Select', 'Checkbox', 'Radio', 'Form',
  'Navbar', 'Menu', 'Breadcrumb', 'Alert', 'Modal', 'Toast', 'Text'
);

COMMIT;
