import { expect, type Page, test } from '@playwright/test';

const AUTH_TOKEN_STORAGE_KEY = 'live-events.auth.token';
const DEFAULT_USER_EMAIL = 'qa.ceiba@liveevents.test';

type ReservationEventOption = {
  id: string;
  name: string;
  startsAt?: string;
  availableTickets?: number;
};

type ReservationPayload = {
  eventId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
};

test.describe('RF-03 Reservar Entrada', () => {
  test('precarga el email del usuario logueado y permite crear una reserva valida', async ({
    page,
  }) => {
    const events = buildReservationEvents();
    let receivedPayload: ReservationPayload | null = null;

    await bootstrapReservationPage(page, {
      userEmail: DEFAULT_USER_EMAIL,
      events,
      onCreate: (payload) => {
        receivedPayload = payload;
        return { status: 201, body: {} };
      },
    });

    await page.goto('/reservations/new');

    await expect(page.locator('[formcontrolname="buyerEmail"]')).toHaveValue(DEFAULT_USER_EMAIL);
    await expect(page.locator('[formcontrolname="buyerEmail"]')).toHaveAttribute('readonly', '');

    await selectReservationEvent(page, 'Angular Summit');
    await page.locator('[formcontrolname="quantity"]').fill('2');
    await page.locator('[formcontrolname="buyerName"]').fill('Alejo Ceiba');
    await page.getByRole('button', { name: 'Crear reserva' }).click();

    await expect(page.getByText('Reserva creada correctamente.')).toBeVisible();
    expect(receivedPayload).toEqual({
      eventId: 'event-angular-summit',
      quantity: 2,
      buyerName: 'Alejo Ceiba',
      buyerEmail: DEFAULT_USER_EMAIL,
    });
  });

  test('mantiene deshabilitado el submit si no se selecciona un evento', async ({ page }) => {
    await bootstrapReservationPage(page, {
      userEmail: DEFAULT_USER_EMAIL,
      events: buildReservationEvents(),
      onCreate: () => ({ status: 201, body: {} }),
    });

    await page.goto('/reservations/new');

    await page.locator('[formcontrolname="quantity"]').fill('1');
    await page.locator('[formcontrolname="buyerName"]').fill('Alejo Ceiba');

    await expect(page.getByRole('button', { name: 'Crear reserva' })).toBeDisabled();
  });

  test('muestra error si la cantidad no es 1 o mas', async ({ page }) => {
    await bootstrapReservationPage(page, {
      userEmail: DEFAULT_USER_EMAIL,
      events: buildReservationEvents(),
      onCreate: () => ({ status: 201, body: {} }),
    });

    await page.goto('/reservations/new');

    await selectReservationEvent(page, 'Angular Summit');
    await page.locator('[formcontrolname="quantity"]').fill('0');
    await page.locator('[formcontrolname="quantity"]').blur();
    await page.locator('[formcontrolname="buyerName"]').fill('Alejo Ceiba');

    await expect(page.getByText('La cantidad debe ser 1 o mas.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear reserva' })).toBeDisabled();
  });

  test('muestra error si el email no tiene formato valido cuando no llega desde sesion', async ({
    page,
  }) => {
    await bootstrapReservationPage(page, {
      userEmail: '',
      events: buildReservationEvents(),
      onCreate: () => ({ status: 201, body: {} }),
    });

    await page.goto('/reservations/new');

    await selectReservationEvent(page, 'Angular Summit');
    await page.locator('[formcontrolname="quantity"]').fill('2');
    await page.locator('[formcontrolname="buyerName"]').fill('Alejo Ceiba');
    await page.locator('[formcontrolname="buyerEmail"]').fill('correo-invalido');
    await page.locator('[formcontrolname="buyerEmail"]').blur();

    await expect(page.getByText('Debes ingresar un email con formato valido.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear reserva' })).toBeDisabled();
  });

  test('restringe a maximo 5 entradas si el evento inicia en menos de 24 horas', async ({
    page,
  }) => {
    await bootstrapReservationPage(page, {
      userEmail: DEFAULT_USER_EMAIL,
      events: buildReservationEvents(),
      onCreate: () => ({ status: 201, body: {} }),
    });

    await page.goto('/reservations/new');

    await selectReservationEvent(page, 'Evento proximo');
    await page.locator('[formcontrolname="quantity"]').fill('6');
    await page.locator('[formcontrolname="quantity"]').blur();
    await page.locator('[formcontrolname="buyerName"]').fill('Alejo Ceiba');

    await expect(
      page.getByText('Este evento inicia en menos de 24 horas. Solo puedes reservar maximo 5 entradas.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Si el evento inicia en menos de 24 horas, solo puedes reservar maximo 5 entradas.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear reserva' })).toBeDisabled();
  });
});

async function bootstrapReservationPage(
  page: Page,
  options: {
    userEmail: string;
    events: ReservationEventOption[];
    onCreate: (payload: ReservationPayload) => { status: number; body: unknown };
  },
): Promise<void> {
  const fakeJwt = createFakeJwt(options.userEmail);

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
            email: options.userEmail,
            avatar: null,
          },
          roles: [],
          portalConfiguration: null,
        },
      }),
    });
  });

  await page.route('**/Api/Events/dropdown', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.events),
    });
  });

  await page.route('**/Api/Reservations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const payload = route.request().postDataJSON() as ReservationPayload;
    const response = options.onCreate(payload);

    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

async function selectReservationEvent(page: Page, eventName: string): Promise<void> {
  await page.locator('.combobox input').click();
  await page.locator('.combobox input').fill(eventName);
  await page.getByRole('button', { name: eventName, exact: true }).click();
}

function buildReservationEvents(): ReservationEventOption[] {
  return [
    {
      id: 'event-angular-summit',
      name: 'Angular Summit',
      startsAt: buildRelativeDate(48),
      availableTickets: 50,
    },
    {
      id: 'event-proximo',
      name: 'Evento proximo',
      startsAt: buildRelativeDate(6),
      availableTickets: 4,
    },
  ];
}

function buildRelativeDate(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString();
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
    userTypeId: 'cliente',
    userTypeName: 'Cliente',
    securityStamp: 'e2e-security-stamp',
    permission: ['reservations.create', 'reservations.read'],
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
