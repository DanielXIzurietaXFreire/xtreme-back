# NestJS Supabase Proxy Backend

Backend para gestionar autenticación y CRUD de clientes usando Supabase Auth y Supabase REST/RPC.

## Endpoints implementados

### Autenticación y usuarios
- `POST /auth/v1/signup`
- `POST /auth/v1/token?grant_type=password`
- `POST /auth/v1/logout`
- `GET /auth/v1/user`

### CRUD de clientes (requiere token Bearer)
- `POST /rest/v1/clientes`
- `GET /rest/v1/clientes?select=*`
- `GET /rest/v1/clientes?id=eq.{id}&select=*`
- `PATCH /rest/v1/clientes?id=eq.{id}`
- `DELETE /rest/v1/clientes?id=eq.{id}`

### Comparación de encoding (RPC)
- `POST /rest/v1/rpc/buscar_clientes_similares`

## Configuración

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Comandos

```bash
npm install
npm run start:dev
```

El servidor se ejecutará en `http://localhost:3000` por defecto.

## Notas

- El backend funciona como proxy entre el cliente y Supabase.
- Las solicitudes a `/rest/v1/...` requieren `Authorization: Bearer <access_token>`.
- El token se valida usando el endpoint de Supabase Auth.
