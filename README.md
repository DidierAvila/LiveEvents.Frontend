# Live Events Frontend

Frontend desarrollado en Angular para la prueba tecnica de gestion de eventos, reservas y administracion basica de recursos de autenticacion.

## Descripcion

La aplicacion consume dos APIs:

- `Api.Authentication`
- `Api.Events`

El proyecto esta organizado con una aproximacion `Feature Driven Architecture`, separando responsabilidades en:

- `core`
- `shared`
- `features`

## Funcionalidades Implementadas

### Autenticacion

- Login real con JWT
- Interceptor para envio de `Bearer token`
- Guards de autenticacion e invitado
- Store reactivo de sesion
- Header con avatar, perfil y logout
- Menus dinamicos segun sesion y permisos

### Eventos

- Creacion de eventos
- Listado de eventos en tabla
- Filtros por titulo, tipo, fecha, estado y lugar
- Paginacion
- Modal de reporte de ocupacion por evento

### Reservas

- Creacion de reservas
- Combobox filtrable de eventos
- Email del comprador precargado desde el usuario logueado
- Listado de mis reservas con paginacion
- Acciones de confirmar pago y cancelar reserva

### Administracion Basica

- Vista de usuarios con grilla paginada
- Modal para ver, actualizar y eliminar usuarios
- Vista de roles con grilla paginada
- Modal para ver, actualizar y eliminar roles
- Vista inicial de permisos

### Pruebas E2E

Se implementaron pruebas automáticas con Playwright para:

- `RF-01 Crear Evento`
- `RF-02 Listar Eventos con Filtros`
- `RF-03 Reservar Entrada`

## Stack Tecnologico

- Angular 21
- TypeScript
- RxJS
- Angular standalone components
- Reactive Forms
- Playwright
- Netlify para despliegue del frontend

## Estructura del Proyecto

```text
src/app
├── core
├── shared
├── features
│   ├── auth
│   ├── events
│   ├── reservations
│   └── venues
└── app.routes.ts
```

## Rutas Principales

- `/auth/login`
- `/auth/me`
- `/auth/users`
- `/auth/roles`
- `/auth/permissions`
- `/events`
- `/events/new`
- `/reservations`
- `/reservations/new`
- `/venues`

## Requisitos

- Node.js 22 o superior
- npm 11 o superior

## Instalacion

```bash
npm install
```

## Ejecucion Local

```bash
npm run start
```

La aplicacion queda disponible en:

```text
http://localhost:4200
```

## Variables de Entorno

La configuracion de APIs se resuelve desde:

- `API_BASE_URL`
- `AUTH_API_BASE_URL`

En local, si no defines variables, el proyecto usa:

- `https://localhost:7257/Api`
- `https://localhost:7154`

En builds de `CI` o `Netlify`, el proyecto exige que estas variables existan para evitar despliegues apuntando a `localhost`.

## Scripts Disponibles

```bash
npm run start
npm run build
npm run watch
npm run test
npm run e2e
npm run e2e:headed
npm run e2e:ui
```

## Build

```bash
npm run build
```

El resultado queda en:

```text
dist/live-events-frontend
```

## Pruebas

### Unitarias

```bash
npm run test
```

### E2E

```bash
npm run e2e
```

Para ejecutar en modo visual:

```bash
npm run e2e:ui
```

## Despliegue

### Frontend Publicado

- URL publica: [liveeventsplatform.netlify.app](https://liveeventsplatform.netlify.app/auth/login)

### Netlify

El proyecto ya incluye `netlify.toml` con:

- comando de build: `npm run build`
- carpeta publicada: `dist/live-events-frontend/browser`
- redireccion SPA a `index.html`

Variables recomendadas en Netlify:

- `API_BASE_URL=https://liveevents-events.onrender.com/Api`
- `AUTH_API_BASE_URL=https://liveevents-auth.onrender.com`

## APIs Integradas

### Authentication API

- Base esperada: `AUTH_API_BASE_URL`
- Ejemplo desplegado: `https://liveevents-auth.onrender.com`

### Events API

- Base esperada: `API_BASE_URL`
- Ejemplo desplegado: `https://liveevents-events.onrender.com/Api`

## Notas Tecnicas

- Los guards validan sesion real y no solo presencia de token.
- La sesion no se elimina automaticamente por errores transitorios del backend.
- El build productivo falla si faltan variables de entorno obligatorias.
- El frontend fue ajustado a contratos reales del backend, incluso cuando el OpenAPI no documentaba completamente algunas respuestas.

## Mejoras Futuras

- Grilla y acciones completas para permisos
- Selectores reales para `roleIds` y `permissionIds`
- Mas pruebas E2E integradas con backend real
- Mejoras de accesibilidad en combobox y modales

## Autor

Proyecto realizado como solucion frontend para prueba tecnica de plataforma de eventos en vivo.
