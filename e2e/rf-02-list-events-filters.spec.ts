import { expect, type Page, test } from '@playwright/test';

const AUTH_TOKEN_STORAGE_KEY = 'live-events.auth.token';
const DEFAULT_USER_EMAIL = 'qa.ceiba@liveevents.test';
const VENUES = [
  { id: 'venue-auditorio', name: 'Auditorio Principal' },
  { id: 'venue-teatro', name: 'Teatro Norte' },
] as const;

const EVENTS = [
  {
    id: 'event-angular-summit',
    title: 'Angular Summit 2026',
    description: 'Evento principal de Angular.',
    venueId: 'venue-auditorio',
    venueName: 'Auditorio Principal',
    maxCapacity: 120,
    startsAt: '2026-08-01T18:00:00',
    endsAt: '2026-08-01T21:00:00',
    ticketPrice: 150000,
    type: 1,
    status: 0,
  },
  {
    id: 'event-node-workshop',
    title: 'Node Workshop',
    description: 'Taller practico de Node.',
    venueId: 'venue-teatro',
    venueName: 'Teatro Norte',
    maxCapacity: 60,
    startsAt: '2026-07-15T09:00:00',
    endsAt: '2026-07-15T12:00:00',
    ticketPrice: 90000,
    type: 2,
    status: 2,
  },
  {
    id: 'event-rock-night',
    title: 'Rock Night',
    description: 'Concierto en vivo.',
    venueId: 'venue-auditorio',
    venueName: 'Auditorio Principal',
    maxCapacity: 300,
    startsAt: '2026-09-10T20:00:00',
    endsAt: '2026-09-10T23:30:00',
    ticketPrice: 200000,
    type: 3,
    status: 1,
  },
] as const;

test.describe('RF-02 Listar Eventos con Filtros', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page);
  });

  test('muestra los filtros y carga lugares disponibles', async ({ page }) => {
    await mockEventsListEndpoint(page);

    await page.goto('/events');

    await expect(page.getByRole('heading', { name: 'Consulta de eventos' })).toBeVisible();
    await expect(page.locator('[formcontrolname="search"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="type"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="venueId"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="status"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="startsFrom"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="startsTo"]')).toBeVisible();
    await expect(page.locator('[formcontrolname="venueId"] option')).toHaveText([
      'Todos',
      'Auditorio Principal',
      'Teatro Norte',
    ]);
  });

  test('filtra por titulo con busqueda parcial case-insensitive', async ({ page }) => {
    let requestedSearch = '';
    await mockEventsListEndpoint(page, (url) => {
      requestedSearch = url.searchParams.get('Search') ?? '';
    });

    await page.goto('/events');
    await page.locator('[formcontrolname="search"]').fill('angular');
    await page.getByRole('button', { name: 'Filtrar' }).click();

    expect(requestedSearch).toBe('angular');
    await expect(page.getByText('Angular Summit 2026')).toBeVisible();
    await expect(page.getByText('Node Workshop')).not.toBeVisible();
    await expect(page.getByText('Rock Night')).not.toBeVisible();
  });

  test('aplica filtros combinados por tipo, venue y estado', async ({ page }) => {
    let requestedUrl = '';
    await mockEventsListEndpoint(page, (url) => {
      requestedUrl = url.toString();
    });

    await page.goto('/events');
    await page.locator('[formcontrolname="type"]').selectOption('3');
    await page.locator('[formcontrolname="venueId"]').selectOption('venue-auditorio');
    await page.locator('[formcontrolname="status"]').selectOption('1');
    await page.getByRole('button', { name: 'Filtrar' }).click();

    expect(requestedUrl).toContain('Type=3');
    expect(requestedUrl).toContain('VenueId=venue-auditorio');
    expect(requestedUrl).toContain('Status=1');
    await expect(page.getByText('Rock Night')).toBeVisible();
    await expect(page.getByText('Angular Summit 2026')).not.toBeVisible();
    await expect(page.getByText('Node Workshop')).not.toBeVisible();
  });

  test('filtra por rango de fecha de inicio', async ({ page }) => {
    await mockEventsListEndpoint(page);

    await page.goto('/events');
    await page.locator('[formcontrolname="startsFrom"]').fill('2026-07-01T00:00');
    await page.locator('[formcontrolname="startsTo"]').fill('2026-08-15T23:59');
    await page.getByRole('button', { name: 'Filtrar' }).click();

    await expect(page.getByText('Angular Summit 2026')).toBeVisible();
    await expect(page.getByText('Node Workshop')).toBeVisible();
    await expect(page.getByText('Rock Night')).not.toBeVisible();
  });
});

async function bootstrapAuthenticatedPage(page: Page): Promise<void> {
  const fakeJwt = createFakeJwt(DEFAULT_USER_EMAIL);

  await page.addInitScript(
    ([storageKey, token]) => {
      window.localStorage.setItem(storageKey, token);
    },
    [AUTH_TOKEN_STORAGE_KEY, fakeJwt],
  );

  await page.route('**/Api/Account/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'user-qa',
            name: 'QA Ceiba',
            email: DEFAULT_USER_EMAIL,
            avatar: null,
          },
          roles: [],
          portalConfiguration: null,
        },
      }),
    });
  });

  await page.route('**/Api/Venues/dropdown', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(VENUES),
    });
  });

  await page.route('**/Api/Events/*/occupation-report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

async function mockEventsListEndpoint(
  page: Page,
  onRequest?: (url: URL) => void,
): Promise<void> {
  await page.route('**/Api/Events**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    onRequest?.(url);

    const filteredEvents = EVENTS.filter((event) => {
      const search = (url.searchParams.get('Search') ?? '').trim().toLowerCase();
      const type = url.searchParams.get('Type');
      const venueId = url.searchParams.get('VenueId');
      const status = url.searchParams.get('Status');
      const startsFrom = url.searchParams.get('StartsFrom');
      const startsTo = url.searchParams.get('StartsTo');

      if (search && !event.title.toLowerCase().includes(search)) {
        return false;
      }

      if (type && String(event.type) !== type) {
        return false;
      }

      if (venueId && event.venueId !== venueId) {
        return false;
      }

      if (status && String(event.status) !== status) {
        return false;
      }

      if (startsFrom && new Date(event.startsAt).getTime() < new Date(startsFrom).getTime()) {
        return false;
      }

      if (startsTo && new Date(event.startsAt).getTime() > new Date(startsTo).getTime()) {
        return false;
      }

      return true;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: filteredEvents,
        page: Number(url.searchParams.get('Page') ?? '1'),
        pageSize: Number(url.searchParams.get('PageSize') ?? '10'),
        totalCount: filteredEvents.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    });
  });
}

function createFakeJwt(email: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const payload = {
    userId: 'user-qa',
    userName: 'QA Ceiba',
    userEmail: email,
    userTypeId: 'admin',
    userTypeName: 'Administrador',
    securityStamp: 'e2e-security-stamp',
    permission: ['events.read'],
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iss: 'playwright',
    aud: 'live-events-frontend',
  };

  return [
    toBase64Url(JSON.stringify(header)),
    toBase64Url(JSON.stringify(payload)),
    'playwright-signature',
  ].join('.');
}

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
