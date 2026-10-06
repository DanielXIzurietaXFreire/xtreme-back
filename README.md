# NestJS Supabase Backend

Backend para login y CRUD de clientes y códigos usando Supabase Auth y Supabase REST.

## Endpoints

### Login
- `POST /auth/v1/token?grant_type=password`

### CRUD de clientes
- `POST /rest/v1/clientes`
- `GET /rest/v1/clientes?select=*`
- `PATCH /rest/v1/clientes?id=eq.{id}`
- `DELETE /rest/v1/clientes?id=eq.{id}`

### CRUD de códigos
- `POST /rest/v1/codigo`
- `GET /rest/v1/codigo`
- `GET /rest/v1/codigo/:cedula`
- `PATCH /rest/v1/codigo/:cedula`

## Configuración

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Rellena `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_KEY`.

## Comandos

```bash
npm install
npm run start:dev
```

El servidor se ejecutará en `http://localhost:3000` por defecto.

## Notas

- El backend funciona como proxy entre la aplicación y Supabase.
- Este proyecto no ejecuta migraciones ni elimina datos de la base de datos.
