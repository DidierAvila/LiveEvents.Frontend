# Despliegue

## Plataforma recomendada

Para una demo rapida del frontend, recomiendo:

- `Render` o `Koyeb` si quieres mostrar despliegue desde contenedor Docker.
- `Netlify` o `Vercel` si solo quieres publicar el frontend estatico sin contenedor.

Si en la prueba te van a valorar especificamente Docker, usa `Render` o `Koyeb`.

## Build local con Docker

```bash
docker build -t live-events-frontend .
docker run --rm -p 8080:8080 live-events-frontend
```

Abrir:

```text
http://localhost:8080
```

## Variables

- `PORT`: puerto interno del contenedor. Por defecto `8080`.

## Despliegue sugerido en Render

1. Subir el proyecto a GitHub.
2. Crear un nuevo servicio `Web Service`.
3. Elegir `Deploy from a Dockerfile`.
4. Seleccionar el repositorio.
5. Configurar el puerto del contenedor en `8080`.
6. Desplegar.

## Despliegue sugerido en Koyeb

1. Conectar el repositorio.
2. Crear un `Web Service` desde Dockerfile.
3. Exponer el puerto `8080`.
4. Desplegar.
