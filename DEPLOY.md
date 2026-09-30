# Despliegue Gratis: Gestor de Ventas

Este proyecto está preparado para desplegarse **gratis** en:
- **Backend**: Render (Node.js) + MongoDB Atlas
- **Frontend**: Cloudflare Pages (Angular)
- **Imágenes**: Preparado para Cloudflare R2 (opcional, 10 GB gratis)

---

## 🚀 Despliegue Rápido (Sin Imágenes - 20 min)

### 1. MongoDB Atlas (5 min)
1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas) → Create cluster → **M0 Free**
2. Usuario/contraseña → Network Access: `0.0.0.0/0` (Allow from anywhere)
3. Copia el **Connection String**: `mongodb+srv://user:pass@cluster.xxx.mongodb.net/gestor_ventas`

### 2. Backend en Render (10 min)
1. Ve a [render.com](https://render.com) → New → Web Service → Conecta GitHub
2. Root Directory: `backend`
3. Build Command: `npm install && npm run build`
4. Start Command: `node dist/main.js`
5. **Environment Variables** (añade una por una):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://user:pass@cluster.xxx.mongodb.net/gestor_ventas
   FRONTEND_URL=https://TU-APP.pages.dev  (cámbialo después)
   IMAGES_DIR=/tmp/uploads
   ```
6. Deploy → Obtienes URL: `https://tu-api.onrender.com`

### 3. Frontend en Cloudflare Pages (5 min)
1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Connect to Git
2. Repositorio → Framework: **Angular**
3. Build command: `npm run build:prod`
4. Build output directory: `dist/frontend/browser`
5. **Environment Variables** (en Pages settings):
   ```
   API_URL=https://tu-api.onrender.com/api
   ```
6. Deploy → URL: `https://tu-app.pages.dev`

### 4. Conectar CORS (1 min)
En Render → tu servicio → Environment → Edita `FRONTEND_URL`:
```
FRONTEND_URL=https://tu-app.pages.dev
```
Redeploy backend (Settings → Manual Deploy → Deploy latest commit).

---

## 🖼️ Activar Imágenes con Cloudflare R2 (Cuando Quieras)

### 1. Crear Bucket R2
1. Cloudflare Dashboard → R2 → Create bucket → Nombre: `gestor-ventas-imagenes`
2. Settings → API Tokens → Create API Token → **Edit R2 bucket** → Tu bucket
3. Anota: `Account ID`, `Access Key ID`, `Secret Access Key`
4. (Opcional) Custom Domain: Settings → Custom Domain → `img.tu-dominio.com`

### 2. Configurar Variables en Render
En tu servicio Render → Environment → Add:
```
R2_ACCOUNT_ID=tu-account-id
R2_ACCESS_KEY_ID=tu-access-key-id
R2_SECRET_ACCESS_KEY=tu-secret-access-key
R2_BUCKET_NAME=gestor-ventas-imagenes
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # o https://img.tu-dominio.com
```
Redeploy backend.

### 3. Configurar Variables en Cloudflare Pages
En Pages → Settings → Environment variables:
```
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # mismo que arriba
```
Redeploy frontend.

### 4. ¡Listo!
- Subir imágenes en el formulario de productos → se guardan en R2
- Las URLs de imágenes son públicas y servidas por CDN global
- 10 GB gratis, 1M requests/mes gratis

---

## 📁 Estructura de Archivos Creados

```
├── backend/
│   ├── render.yaml              # Config Render (infra as code)
│   ├── src/
│   │   ├── main.ts              # CORS configurado, sin servir frontend
│   │   ├── storage/
│   │   │   ├── storage.interface.ts      # Interfaz común
│   │   │   ├── local-storage.provider.ts # Implementación disco local
│   │   │   ├── r2-storage.provider.ts    # Implementación R2 (lista)
│   │   │   └── storage.module.ts         # Auto-selección por config
│   │   ├── products/products.service.ts  # Usa storage provider
│   │   ├── uploads/uploads.controller.ts # Usa storage provider
│   │   └── assets/assets.module.ts       # Redirige a R2 si configurado
├── frontend/
│   ├── angular.json             # Define __ENV_API_BASE__ en build
│   ├── package.json             # Script build:prod con API_URL
│   └── src/app/core/data.ts     # Lee API_URL en build time
├── .env.example                 # Variables backend
└── frontend/.env.example        # Variables frontend
```

---

## 🔧 Desarrollo Local

### Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tu MONGODB_URI local
npm run start:dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.production
# Edita .env.production con API_URL=http://localhost:3000/api
npm run build:prod
# O para dev:
npm run start
```

---

## ⚠️ Limitaciones del Tier Gratis

| Servicio | Límite | Impacto |
|----------|--------|---------|
| **Render Free** | Duerme a los 15 min inactivo | Primera petición tarda ~45 seg |
| **Render Free** | 5 GB BW/mes | Suficiente para uso personal |
| **MongoDB Atlas M0** | 512 MB storage | Miles de productos/ventas |
| **MongoDB Atlas M0** | Sin backups auto | Usa `mongodump` manual |
| **Cloudflare Pages** | Ilimitado | Sin límites reales |
| **Cloudflare R2** | 10 GB / 1M req | ~10,000 fotos de productos |

---

## 🛠️ Solución de Problemas

### Backend no conecta a MongoDB
- Verifica `MONGODB_URI` en Render (sin comillas)
- Network Access en Atlas: `0.0.0.0/0`
- IP de Render cambia dinámicamente → Atlas debe permitir todas

### CORS Error
- `FRONTEND_URL` en Render debe coincidir **exacto** con tu URL de Pages
- Incluye `https://` y sin barra final

### Imágenes no se ven
- Sin R2: Las imágenes se pierden al dormir Render (usa `/tmp/uploads`)
- Con R2: Verifica `R2_PUBLIC_URL` accesible públicamente

### Frontend no encuentra API
- En Cloudflare Pages: `API_URL` debe terminar en `/api`
- Rebuild frontend tras cambiar variable: Pages → Deployments → Retry

---

## 📦 Migración a Pagado (Si Crece)

| Necesidad | Upgrade | Coste aprox. |
|-----------|---------|--------------|
| API siempre despierta | Render Starter ($7/mes) | $7/mes |
| Más storage MongoDB | Atlas M2 (2 GB) | $9/mes |
| Más imágenes | R2 pay-as-you-go | $0.015/GB/mes |
| Dominio propio | Cloudflare/Namecheap | ~$10/año |

---

## ✅ Checklist Pre-Deploy

- [ ] MongoDB Atlas cluster M0 creado
- [ ] Usuario BD con permisos readWrite
- [ ] Network Access: `0.0.0.0/0`
- [ ] Repo en GitHub (backend + frontend en mismo repo o separados)
- [ ] Render conectado a GitHub
- [ ] Variables de entorno en Render configuradas
- [ ] Cloudflare Pages conectado a GitHub
- [ ] `API_URL` en Pages apunta a tu Render URL + `/api`
- [ ] `FRONTEND_URL` en Render apunta a tu Pages URL
- [ ] Primer deploy backend OK (logs: "Server running on port 10000")
- [ ] Primer deploy frontend OK
- [ ] Login funciona, crea producto, crea venta
- [ ] (Opcional) R2 configurado y probado

---

## 🎯 Próximos Pasos Opcionales

1. **Dominio propio**: Cloudflare Pages → Custom domains
2. **Backups MongoDB**: Script `mongodump` semanal (GitHub Actions)
3. **Monitoring**: Render logs + Cloudflare Analytics
4. **CI/CD**: GitHub Actions para tests automáticos