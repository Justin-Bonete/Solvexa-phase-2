import { Link } from 'react-router-dom';
import { footerGroups } from '@content/navigation';
import { siteConfig, visible } from '@content/site.config';
import { Container } from '@/components/ui/Feedback';

export function Footer() {
  const email = visible(siteConfig.contact.email);
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="grid gap-10 py-12 text-sm text-muted md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm space-y-2">
          <p className="font-semibold text-fg">{siteConfig.brand.name}</p>
          <p>
            {siteConfig.brand.tagline.value}. I build, improve, and maintain software that has to keep
            working.
          </p>
          {email && (
            <a className="inline-block pt-2 hover:text-fg" href={`mailto:${email}`}>
              {email}
            </a>
          )}
        </div>
        {footerGroups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="font-medium text-fg">{g.title}</p>
            <ul className="mt-3 space-y-2">
              {g.items
                .filter((i) => i.enabled)
                .map((i) => (
                  <li key={i.to}>
                    <Link className="hover:text-fg" to={i.to}>
                      {i.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="pb-8 text-xs text-faint">© 2026 {siteConfig.brand.name}</Container>
    </footer>
  );
}
