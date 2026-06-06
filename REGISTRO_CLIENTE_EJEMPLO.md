# Ejemplo: Registrar Cliente con Descriptor Facial

## Endpoint
```
POST /rest/v1/clientes/register
```

## Body (JSON)
```json
{
  "nombre": "Juan Pérez",
  "image_url": "https://tu-cdn.com/fotos/juan.jpg",
  "descriptor": [0.123, 0.456, -0.789, ... 128 números totales]
}
```

## Validaciones del Backend
✅ `nombre` debe ser string no vacío
✅ `image_url` debe ser string no vacío (puede ser URL Supabase o externa)
✅ `descriptor` debe ser array de exactamente **128 números**

## Respuesta Éxito (200)
```json
{
  "success": true,
  "message": "Cliente registrado exitosamente",
  "data": [
    {
      "id": "uuid-aqui",
      "nombre": "Juan Pérez",
      "image_url": "https://tu-cdn.com/fotos/juan.jpg",
      "embedding": [0.123, 0.456, -0.789, ...]
    }
  ]
}
```

## Respuestas Error

### 400 - Validación Fallida
```json
{
  "statusCode": 400,
  "message": "descriptor debe contener exactamente 128 elementos, recibido: 64"
}
```

### 400 - Validación Fallida
```json
{
  "statusCode": 400,
  "message": "El cliente ya existe en la base de datos"
}
```

### 500 - Error de Conexión
```json
{
  "statusCode": 500,
  "message": "Error de conexión con la base de datos. Intenta más tarde."
}
```

---

## Ejemplo cURL
```bash
curl -X POST http://localhost:3000/rest/v1/clientes/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "image_url": "https://example.com/foto.jpg",
    "descriptor": [0.1, 0.2, 0.3, ..., 128 números]
  }'
```

---

## Flujo Fronted → Backend

1. **Frontend** carga imagen en `<canvas>`
2. **Frontend** usa face-api.js:
   ```javascript
   const canvas = document.getElementById('canvas');
   const detection = await faceapi.detectSingleFace(canvas)
     .withFaceLandmarks()
     .withFaceDescriptor();
   
   const descriptor = Array.from(detection.descriptor); // Convierte a array
   ```

3. **Frontend** hace POST a `/rest/v1/clientes/register`:
   ```javascript
   const response = await fetch('/rest/v1/clientes/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       nombre: 'Juan Pérez',
       image_url: 'https://cdn.com/foto.jpg',
       descriptor: descriptor
     })
   });
   ```

4. **Backend** valida y guarda en Supabase (tabla `clientes`, columna `embedding`)

5. **Reconocimiento** luego compara descriptores usando Euclidean distance

---

## Estructura Tabla Supabase

```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  image_url TEXT,
  embedding JSONB,  -- Array de 128 números
  created_at TIMESTAMP DEFAULT now()
);
```

**Columnas usadas:**
- `embedding`: Guardar el descriptor facial (128 números) como JSONB
- `image_url`: URL de la foto del cliente
- `nombre`: Nombre del cliente
