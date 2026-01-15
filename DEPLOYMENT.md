# Guía Completa de Despliegue

Esta guía detalla paso a paso cómo desplegar la aplicación RPG Character Manager en producción usando Vercel para el frontend y Firebase para el backend.

## Tabla de Contenidos

1. [Preparación del Proyecto](#preparación-del-proyecto)
2. [Configuración de Firebase](#configuración-de-firebase)
3. [Despliegue del Frontend en Vercel](#despliegue-del-frontend-en-vercel)
4. [Verificación Post-Despliegue](#verificación-post-despliegue)
5. [Dominios Personalizados](#dominios-personalizados)
6. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## Preparación del Proyecto

### 1. Verificar que el proyecto compile correctamente

```bash
cd rpg-character-manager

# Instalar dependencias
npm install

# Build de producción
npm run build -- --configuration=production

# Verificar que no hay errores
```

### 2. Crear archivo de producción para variables de entorno

Edita `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "TU_API_KEY_DE_PRODUCCION",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  }
};
```

---

## Configuración de Firebase

### Paso 1: Crear Proyecto en Firebase

1. Accede a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Añadir proyecto"
3. Nombre: `rpg-character-manager` (o el que prefieras)
4. Desactiva Google Analytics (opcional para producción)
5. Click en "Crear proyecto"

### Paso 2: Configurar Authentication

1. En el menú lateral, ve a **Build > Authentication**
2. Click en "Comenzar"
3. Pestaña "Sign-in method"
4. Habilita:
   - **Correo electrónico/contraseña**: Activar
   - **Google**: Activar y configurar correo de soporte

### Paso 3: Crear Base de Datos Firestore

1. Ve a **Build > Firestore Database**
2. Click en "Crear base de datos"
3. Selecciona ubicación (preferiblemente cerca de tus usuarios)
4. Inicia en **modo de producción**

### Paso 4: Configurar Storage

1. Ve a **Build > Storage**
2. Click en "Comenzar"
3. Acepta las reglas iniciales
4. Selecciona la misma ubicación que Firestore

### Paso 5: Obtener Credenciales

1. Ve a **Project Settings** (ícono de engranaje)
2. Desplázate a "Your apps"
3. Click en el ícono de Web `</>`
4. Registra la app con nombre "RPG Character Manager Web"
5. Copia el objeto `firebaseConfig`

### Paso 6: Desplegar Security Rules

```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Iniciar sesión en Firebase
firebase login

# Inicializar el proyecto Firebase (en la carpeta del proyecto)
firebase init

# Selecciona:
# - Firestore: Configure security rules and indexes
# - Storage: Configure a security rules file

# Cuando pregunte por las reglas, usa los archivos existentes:
# - firestore.rules
# - storage.rules
```

Desplegar las reglas:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### Paso 7: Configurar CORS para Storage (Opcional)

Crea `cors.json`:

```json
[
  {
    "origin": ["https://tu-dominio.vercel.app", "http://localhost:4200"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Aplica la configuración:

```bash
gsutil cors set cors.json gs://tu-proyecto.appspot.com
```

---

## Despliegue del Frontend en Vercel

### Método 1: Desde la Interfaz Web (Recomendado)

#### 1. Preparar el repositorio

```bash
# Asegúrate de que todo esté commiteado
git add .
git commit -m "Preparar para producción"
git push origin main
```

#### 2. Conectar con Vercel

1. Ve a [Vercel](https://vercel.com) y crea una cuenta
2. Click en "Add New Project"
3. Importa tu repositorio de GitHub/GitLab/Bitbucket
4. Selecciona el repositorio `rpg-character-manager`

#### 3. Configurar el proyecto

En la pantalla de configuración:

- **Framework Preset**: Angular
- **Root Directory**: `rpg-character-manager` (si está en subcarpeta)
- **Build Command**: `npm run build -- --configuration=production`
- **Output Directory**: `dist/rpg-character-manager/browser`
- **Install Command**: `npm install`

#### 4. Variables de Entorno (Opcional)

Si prefieres no tener las credenciales en el código:

```
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
```

#### 5. Desplegar

Click en "Deploy" y espera a que termine el proceso.

### Método 2: Desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# En la carpeta del proyecto
cd rpg-character-manager

# Iniciar sesión
vercel login

# Desplegar (primera vez - configuración interactiva)
vercel

# Para producción
vercel --prod
```

### Configuración de vercel.json

Crea `vercel.json` en la raíz:

```json
{
  "buildCommand": "npm run build -- --configuration=production",
  "outputDirectory": "dist/rpg-character-manager/browser",
  "framework": "angular",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## Verificación Post-Despliegue

### 1. Verificar que la app carga

- Accede a la URL de Vercel (ej: `https://tu-proyecto.vercel.app`)
- Debe mostrar la pantalla de login

### 2. Probar autenticación

- Crea una cuenta nueva
- Verifica que puedas iniciar sesión
- Prueba Google Sign-In

### 3. Probar Firestore

- Crea un universo
- Crea un personaje
- Verifica que los datos persisten

### 4. Probar Storage

- Sube un avatar de personaje
- Comparte una ficha y verifica que se genera el enlace

### 5. Probar WebLLM

- Ve a la pestaña IA
- Carga el modelo
- Analiza una acción

### 6. Configurar dominio en Firebase

Si usas un dominio personalizado, añádelo a Firebase:

1. Ve a **Authentication > Settings > Authorized domains**
2. Añade tu dominio de Vercel

---

## Dominios Personalizados

### En Vercel

1. Ve a tu proyecto en Vercel
2. Settings > Domains
3. Añade tu dominio (ej: `rpg.tudominio.com`)
4. Configura los DNS según las instrucciones

### Configurar DNS

Tipo A o CNAME según lo que indique Vercel:

```
# Ejemplo CNAME
rpg.tudominio.com  CNAME  cname.vercel-dns.com
```

### Actualizar Firebase

Después de añadir el dominio:

1. Actualiza `authDomain` en `environment.prod.ts` si usas dominio propio
2. Añade el dominio a Firebase Auth > Authorized domains

---

## Monitoreo y Mantenimiento

### Firebase Console

- **Usage and billing**: Monitorea el uso
- **Firestore > Usage**: Revisa lecturas/escrituras
- **Authentication > Users**: Gestiona usuarios

### Vercel Analytics

1. En tu proyecto de Vercel
2. Analytics tab
3. Habilita Web Analytics (gratis para proyectos pequeños)

### Logs

```bash
# Ver logs de despliegue en Vercel
vercel logs

# Ver logs de Firebase Functions (si las usas)
firebase functions:log
```

### Actualizaciones

```bash
# Actualizar dependencias
npm update

# Verificar vulnerabilidades
npm audit

# Re-desplegar
vercel --prod
```

---

## Costos Estimados

### Firebase (Plan Spark - Gratis)

- **Firestore**: 50,000 lecturas/día, 20,000 escrituras/día
- **Storage**: 5GB almacenamiento, 1GB/día descarga
- **Auth**: Sin límite de usuarios

### Vercel (Plan Hobby - Gratis)

- **Bandwidth**: 100GB/mes
- **Builds**: 6,000 minutos/mes
- **Serverless Functions**: 100GB-hrs/mes

Para la mayoría de proyectos personales o pequeños, el plan gratuito es suficiente.

---

## Checklist Final

- [ ] Firebase project creado
- [ ] Authentication configurado
- [ ] Firestore creado con reglas desplegadas
- [ ] Storage configurado con reglas desplegadas
- [ ] Variables de entorno actualizadas
- [ ] Build de producción funciona
- [ ] Desplegado en Vercel
- [ ] Dominio configurado (opcional)
- [ ] Login funciona
- [ ] CRUD de personajes funciona
- [ ] IA local funciona
- [ ] Compartir fichas funciona

---

## Soporte

Si encuentras problemas:

1. Revisa los logs de Vercel
2. Revisa la consola del navegador
3. Verifica las reglas de Firebase
4. Abre un issue en el repositorio
