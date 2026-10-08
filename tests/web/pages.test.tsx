// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { BRAND_LINES, BRAND_LEAD } from '@content/brand';
import { improvementSteps } from '@content/solutions';
import { services } from '@content/services';
import { projects } from '@content/projects';
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import { Maintenance } from '@/pages/Landing';
import { ProcessVisual } from '@/components/marketing/ProcessVisual';
import { CompareTable } from '@/components/marketing/Blocks';

afterEach(cleanup);
const at = (ui: React.ReactNode, url = '/') =>
  render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

function headingLevels(root: HTMLElement) {
  return [...root.querySelectorAll('h1,h2,h3,h4')].map((h) => Number(h.tagName[1]));
}

describe('Home', () => {
  it('has one h1, the hero CTAs, the lead of the brand message in the hero, and the full message in its own section', () => {
    const { container } = at(<Home />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Build. Improve. Maintain. Scale.');
    expect(screen.getAllByRole('link', { name: 'View My Work' })[0]).toHaveAttribute('href', '/projects');
    expect(screen.getAllByText(BRAND_LEAD).length).toBeGreaterThanOrEqual(3); // hero, dedicated section, final CTA
    const message = container.querySelector('#message') as HTMLElement;
    for (const line of BRAND_LINES) expect(within(message).getByText(line)).toBeInTheDocument();
  });
  it('shows all four entry paths and links each to a page that exists', () => {
    at(<Home />);
    for (const href of [
      '/new-system-development',
      '/enhancement',
      '/maintenance',
      '/maintenance#support-plans',
    ]) {
      expect(document.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
  });
  it('links CTAs whose pages exist and disables the one that does not, with the reason visible', () => {
    at(<Home />);
    expect(screen.getAllByRole('link', { name: 'Start a Project' })[0]).toHaveAttribute('href', '/contact');
    expect(screen.getAllByRole('link', { name: 'Request System Assessment' })[0]).toHaveAttribute(
      'href',
      '/assessment',
    );
    const support = screen.getByRole('button', { name: 'Get Technical Support' });
    expect(support).toHaveAttribute('aria-disabled', 'true');
    expect(support).toHaveAccessibleDescription(/support area/i);
    expect(screen.queryByRole('link', { name: 'Get Technical Support' })).toBeNull();
  });
  it('renders sections in the specified order', () => {
    const { container } = at(<Home />);
    const ids = [...container.querySelectorAll('section[id]')].map((s) => s.id);
    const expected = [
      'why',
      'message',
      'services',
      'existing',
      'solutions',
      'featured',
      'case-studies',
      'technology',
      'process',
      'maintenance',
      'testimonials',
      'faq',
      'start',
      'contact',
    ];
    expect(ids).toEqual(expected);
  });
  it('never skips a heading level', () => {
    const { container } = at(<Home />);
    const levels = headingLevels(container);
    for (let i = 1; i < levels.length; i++)
      expect((levels[i] as number) - (levels[i - 1] as number)).toBeLessThanOrEqual(1);
  });
  it('labels placeholder content instead of presenting it as real', () => {
    at(<Home />);
    expect(screen.getAllByText('Placeholder').length).toBeGreaterThan(0);
  });
});

describe('ProcessVisual (keyboard)', () => {
  it('uses roving tabindex and responds to arrow, Home and End keys', () => {
    render(<ProcessVisual steps={improvementSteps} label="Steps" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(8);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
    fireEvent.keyDown(tabs[0] as HTMLElement, { key: 'ArrowRight' });
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Assessment');
    fireEvent.keyDown(screen.getAllByRole('tab')[1] as HTMLElement, { key: 'End' });
    expect(screen.getAllByRole('tab')[7]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getAllByRole('tab')[7] as HTMLElement, { key: 'ArrowRight' }); // wraps
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getAllByRole('tab')[0] as HTMLElement, { key: 'ArrowLeft' }); // wraps back
    expect(screen.getAllByRole('tab')[7]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getAllByRole('tab')[7] as HTMLElement, { key: 'Home' });
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
  });
  it('links each tab to the panel and starts the steps in the specified order', () => {
    render(<ProcessVisual steps={improvementSteps} label="Steps" />);
    const names = screen.getAllByRole('tab').map((t) => t.textContent?.replace(/^\d+/, ''));
    expect(names).toEqual([
      'Existing System',
      'Assessment',
      'Technical Analysis',
      'Improvement Plan',
      'Development',
      'Testing',
      'Deployment',
      'Maintenance',
    ]);
    const panel = screen.getByRole('tabpanel');
    expect(screen.getAllByRole('tab')[0]?.getAttribute('aria-controls')).toBe(panel.id);
  });
});

describe('Services and Solutions', () => {
  it('lists 12 services, each with its own anchor and a CTA', () => {
    const { container } = at(<Services />);
    for (const s of services) {
      const card = container.querySelector(`article#${s.id}`) as HTMLElement;
      expect(card, s.id).not.toBeNull();
      expect(within(card).getAllByRole(card.querySelector('a') ? 'link' : 'button').length).toBeGreaterThan(
        0,
      );
    }
    expect(container.querySelectorAll('article')).toHaveLength(12);
  });
  it('comparison table has a caption and column/row headers', () => {
    const { container } = render(<CompareTable />);
    expect(container.querySelector('caption')).not.toBeNull();
    expect(container.querySelectorAll('th[scope="col"]')).toHaveLength(3);
    expect(container.querySelectorAll('th[scope="row"]').length).toBeGreaterThanOrEqual(6);
  });
  it('maintenance page defines the #support-plans anchor used by the entry path', () => {
    const { container } = at(<Maintenance />);
    expect(container.querySelector('#support-plans')).not.toBeNull();
  });
});

describe('Projects page', () => {
  it('filters by search and category via the URL, and shows an empty state with a working reset', () => {
    at(<Projects />);
    expect(screen.getByRole('status')).toHaveTextContent(`${projects.length} projects`);
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'grading' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 project');
    expect(screen.getAllByRole('link', { name: /Online Grading Viewer System/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Smart Inventory/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('Search projects'), { target: { value: 'nothing-like-this' } });
    expect(screen.getByText('No projects match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('status')).toHaveTextContent(`${projects.length} projects`);
  });
  it('category buttons expose pressed state and narrow the list', () => {
    at(<Projects />);
    const academic = screen.getByRole('button', { name: /Academic Systems/ });
    expect(academic).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(academic);
    expect(screen.getByRole('button', { name: /Academic Systems/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('1 project');
  });
});

describe('Project detail', () => {
  const route = (slug: string) =>
    at(
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>,
      `/projects/${slug}`,
    );
  it('follows the case-study structure, shows "Not yet measured" for results, and says what is missing', () => {
    const { container } = route(projects[0]?.slug as string);
    const ids = [...container.querySelectorAll('section[id]')].map((s) => s.id);
    expect(ids).toEqual([
      'overview',
      'problem',
      'solution',
      'features',
      'technology',
      'architecture',
      'challenges',
      'process',
      'results',
      'lessons',
    ]);
    expect(
      within(container.querySelector('#results') as HTMLElement).getByText('Not yet measured.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Not yet provided.').length).toBeGreaterThan(3);
    expect(screen.getByRole('link', { name: 'Need Something Similar?' })).toHaveAttribute('href', '/contact');
  });
  it('shows the not-found page for an unknown project', () => {
    route('does-not-exist');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('That page does not exist');
  });
});
