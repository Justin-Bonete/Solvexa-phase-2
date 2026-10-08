/** A link is only rendered when `enabled` is true, so the nav never points at pages that do not exist. */
export type NavItem = { label: string; to: string; enabled: boolean };

export const mainNav: NavItem[] = [
  { label: 'Services', to: '/services', enabled: true },
  { label: 'Solutions', to: '/solutions', enabled: true },
  { label: 'Projects', to: '/projects', enabled: true },
  { label: 'Process', to: '/process', enabled: true },
  { label: 'About', to: '/about', enabled: true },
  { label: 'Contact', to: '/contact', enabled: true },
];

export const footerGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Work with me',
    items: [
      { label: 'New system development', to: '/new-system-development', enabled: true },
      { label: 'Enhancement', to: '/enhancement', enabled: true },
      { label: 'Maintenance', to: '/maintenance', enabled: true },
    ],
  },
  {
    title: 'About',
    items: [
      { label: 'Process', to: '/process', enabled: true },
      { label: 'Technology', to: '/technology', enabled: true },
      { label: 'FAQ', to: '/faq', enabled: true },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy', to: '/privacy', enabled: true },
      { label: 'Terms', to: '/terms', enabled: true },
    ],
  },
];
