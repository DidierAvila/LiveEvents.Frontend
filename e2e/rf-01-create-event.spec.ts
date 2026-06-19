import { expect, type Page, test } from '@playwright/test';

const AUTH_TOKEN_STORAGE_KEY = 'live-events.auth.token';
const DEFAULT_USER_EMAIL = 'qa.ceiba@liveevents.test';
const VENUES = [
  { id: 'venue-auditorio', name: 'Auditorio Principal' },
  { id: 'venue-teatro', name: 'Teatro Norte' },
] as const;

type EventFormValues = {
  title: string;
  description: string;
  venueId: string;
  maxCapacity: string;
  startsAt: string;
  endsAt: string;
  ticketPrice: string;
  type: '1' | '2' | '3';
};

type EventPayload = {
  title: string;
  description: string;
  venueId: string;
  maxCapacity: number;
  startsAt: string;
  endsAt: string;
  ticketPrice: number;
  type: number;
};

test.describe('RF-01 Crear Evento', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page);
  });

  test('carga el formulario y los lugares disponibles', async ({ page }) => {
    await mockCreateEventEndpoint(page, () => ({
      status: 201,
      body: {},
    }));

    await page.goto('/events/new');

    await expect(page.getByRole('heading', { name: 'Crear evento' })).toBeVisible();
    await expect(page.locator('[formcontrolname="venueId"] option')).toHaveCount(3);
    await expect(page.locator('[formcontrolname="venueId"] option')).toHaveText([
      'Selecciona un lugar',
      'Auditorio Principal',
      'Teatro Norte',
    ]);
  });

  test('envia un evento valido con el payload esperado', async ({ page }) => {
    let receivedPayload: EventPayload | null = null;

    await mockCreateEventEndpoint(page, (payload) => {
      receivedPayload = payload;

      return {
        status: 201,
        body: {},
      };
    });

    await page.goto('/events/new');

    const formValues = buildValidFormValues();
    await fillEventForm(page, formValues);
    await page.getByRole('button', { name: 'Crear evento' }).click();

    await expect(page.getByText('Evento creado correctamente.')).toBeVisible();
    await expect(page.locator('[formcontrolname="title"]')).toHaveValue('');
    expect(receivedPayload).toEqual({
      title: formValues.title,
      description: formValues.description,
      venueId: formValues.venueId,
      maxCapacity: Number(formValues.maxCapacity),
      startsAt: `${formValues.startsAt}:00`,
      endsAt: `${formValues.endsAt}:00`,
      ticketPrice: Number(formValues.ticketPrice),
      type: Number(formValues.type),
    });
  });

  test('mantiene deshabilitado el submit si faltan datos obligatorios o textos no cumplen longitud minima', async ({
    page,
  }) => {
    await mockCreateEventEndpoint(page, () => ({
      status: 201,
      body: {},
    }));

    await page.goto('/events/new');

    const submitButton = page.getByRole('button', { name: 'Crear evento' });
    await expect(submitButton).toBeDisabled();

    const invalidValues = buildValidFormValues({
      title: 'Abcd',
      description: 'Muy corta',
    });
    await fillEventForm(page, invalidValues);
    await page.locator('[formcontrolname="description"]').blur();

    await expect(submitButton).toBeDisabled();
    await expect(page.getByText('El titulo debe tener entre 5 y 100 caracteres.')).toBeVisible();
    await expect(
      page.getByText('La descripcion debe tener entre 10 y 500 caracteres.'),
    ).toBeVisible();

    await page.locator('[formcontrolname="title"]').fill('Conferencia Angular 2026');
    await page
      .locator('[formcontrolname="description"]')
      .fill('Descripcion valida para habilitar el envio del formulario.');

    await expect(submitButton).toBeEnabled();
  });

  test.describe('reglas funcionales del requerimiento', () => {
    test('muestra error si la capacidad maxima no es un entero positivo', async ({
      page,
    }) => {
      await mockCreateEventEndpoint(page, () => ({ status: 201, body: {} }));

      await page.goto('/events/new');

      await fillEventForm(
        page,
        buildValidFormValues({
          maxCapacity: '0',
        }),
      );
      await page.locator('[formcontrolname="maxCapacity"]').blur();

      await expect(
        page.getByText('La capacidad maxima debe ser un entero positivo.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear evento' })).toBeDisabled();
    });

    test('muestra error si la fecha de inicio no es futura', async ({ page }) => {
      await mockCreateEventEndpoint(page, () => ({ status: 201, body: {} }));

      await page.goto('/events/new');

      await fillEventForm(
        page,
        buildValidFormValues({
          startsAt: buildDateInputValue(-1, 9, 0),
          endsAt: buildDateInputValue(1, 11, 0),
        }),
      );
      await page.locator('[formcontrolname="startsAt"]').blur();

      await expect(
        page.getByText('La fecha y hora de inicio debe ser futura.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear evento' })).toBeDisabled();
    });

    test('muestra error si la fecha de fin es anterior al inicio', async ({ page }) => {
      await mockCreateEventEndpoint(page, () => ({ status: 201, body: {} }));

      await page.goto('/events/new');

      await fillEventForm(
        page,
        buildValidFormValues({
          startsAt: buildDateInputValue(2, 18, 0),
          endsAt: buildDateInputValue(2, 17, 0),
        }),
      );
      await page.locator('[formcontrolname="endsAt"]').blur();

      await expect(
        page.getByText('La fecha y hora de fin debe ser posterior al inicio.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear evento' })).toBeDisabled();
    });

    test('mantiene deshabilitado el submit si el precio no es positivo', async ({
      page,
    }) => {
      await mockCreateEventEndpoint(page, () => ({ status: 201, body: {} }));

      await page.goto('/events/new');

      await fillEventForm(
        page,
        buildValidFormValues({
          ticketPrice: '0',
        }),
      );
      await page.locator('[formcontrolname="ticketPrice"]').blur();

      await expect(
        page.getByText('El precio de entrada debe ser un decimal positivo.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Crear evento' })).toBeDisabled();
    });
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
}

async function mockCreateEventEndpoint(
  page: Page,
  resolver: (payload: EventPayload) => { status: number; body: unknown },
): Promise<void> {
  await page.route('**/Api/Events', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const payload = route.request().postDataJSON() as EventPayload;
    const response = resolver(payload);

    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

function buildValidFormValues(
  overrides: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    title: 'Conferencia Angular 2026',
    description:
      'Evento enfocado en arquitectura Angular, pruebas y buenas practicas.',
    venueId: VENUES[0].id,
    maxCapacity: '80',
    startsAt: buildDateInputValue(2, 18, 0),
    endsAt: buildDateInputValue(2, 21, 0),
    ticketPrice: '120000',
    type: '1',
    ...overrides,
  };
}

async function fillEventForm(page: Page, values: EventFormValues): Promise<void> {
  await page.locator('[formcontrolname="title"]').fill(values.title);
  await page.locator('[formcontrolname="description"]').fill(values.description);
  await page.locator('[formcontrolname="venueId"]').selectOption(values.venueId);
  await page.locator('[formcontrolname="maxCapacity"]').fill(values.maxCapacity);
  await page.locator('[formcontrolname="startsAt"]').fill(values.startsAt);
  await page.locator('[formcontrolname="endsAt"]').fill(values.endsAt);
  await page.locator('[formcontrolname="ticketPrice"]').fill(values.ticketPrice);
  await page.locator('[formcontrolname="type"]').selectOption(values.type);
}

function buildDateInputValue(dayOffset: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const normalizedHours = String(date.getHours()).padStart(2, '0');
  const normalizedMinutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${normalizedHours}:${normalizedMinutes}`;
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
    permission: ['events.create', 'events.read'],
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
