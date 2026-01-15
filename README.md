# RPG Character Manager con IA Local

Una aplicación Angular 19 + Ionic 7 con Firebase y WebLLM para gestionar personajes RPG con estadísticas dinámicas, fichas compartibles y análisis de acciones mediante IA local.

## Características

- **Gestión de Personajes**: Crea, edita y elimina personajes con estadísticas personalizables
- **Universos de Reglas**: Define sistemas de reglas RPG con estadísticas y reglas de progresión personalizadas
- **IA Local con WebLLM**: Analiza acciones de personajes usando Phi-3 directamente en el navegador (sin servidor)
- **Fichas Compartibles**: Genera fichas visuales con código QR para compartir por redes sociales
- **Tema Oscuro**: Diseño moderno y elegante con tema oscuro por defecto
- **Offline First**: La IA funciona completamente offline una vez descargado el modelo

## Stack Tecnológico

- **Frontend**: Angular 19 + Ionic 7 (Standalone Components)
- **State Management**: NgRx Signal Store
- **Backend**: Firebase (Firestore, Auth, Storage)
- **IA Local**: WebLLM con Phi-3-mini-4k-instruct
- **Gráficos**: Custom SVG Radar Chart
- **Compartir**: html2canvas + QR Code

## Requisitos del Sistema

### Para Desarrollo
- Node.js 18+ (recomendado 20+)
- npm 9+
- Git

### Para IA Local (WebLLM)
| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| RAM | 8GB | 16GB |
| GPU VRAM | 2.5GB | 4GB+ |
| Almacenamiento | 3GB | 5GB |
| Navegador | Chrome 113+ | Chrome/Edge última versión |

## Instalación Local

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd rpg-character-manager

# Instalar dependencias
npm install

# Configurar variables de entorno
# Editar src/environments/environment.ts con tus credenciales de Firebase

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## Configuración de Firebase

### 1. Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Authentication** (Email/Password y Google)
4. Habilita **Cloud Firestore**
5. Habilita **Storage**

### 2. Obtener Credenciales

1. En Project Settings > General, desplázate a "Your apps"
2. Añade una app web
3. Copia la configuración de Firebase

### 3. Configurar Variables de Entorno

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  }
};
```

### 4. Desplegar Security Rules

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Iniciar sesión
firebase login

# Inicializar proyecto (seleccionar Firestore y Storage)
firebase init

# Desplegar reglas
firebase deploy --only firestore:rules,storage
```

## Despliegue en Producción

### Opción 1: Vercel (Recomendado para Frontend)

#### Preparación

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Instala Vercel CLI:
   ```bash
   npm install -g vercel
   ```

#### Despliegue

```bash
# Build de producción
npm run build -- --configuration=production

# Desplegar a Vercel
vercel --prod
```

### Opción 2: Firebase Hosting

```bash
# Build de producción
npm run build -- --configuration=production

# Desplegar a Firebase Hosting
firebase deploy --only hosting
```

**Para instrucciones detalladas de despliegue, consulta [DEPLOYMENT.md](./DEPLOYMENT.md)**

## Estructura del Proyecto

```
src/app/
├── core/                          # Servicios singleton
│   ├── services/                  # Firebase, Auth, WebLLM, Share
│   ├── guards/                    # Auth guards
│   └── models/                    # TypeScript interfaces
├── shared/                        # Componentes reutilizables
│   ├── ui/                        # stat-bar, radar-chart, cards
│   ├── pipes/                     # Pipes personalizados
│   └── animations/                # Animaciones
├── modules/
│   ├── auth/                      # Login/Register
│   ├── characters/                # CRUD de personajes
│   ├── universes/                 # Gestión de universos
│   └── ai-assistant/              # Asistente IA
└── layout/
    └── tabs/                      # Navegación principal
```

## Uso de la Aplicación

### 1. Crear un Universo

1. Ve a la pestaña "Universos"
2. Toca el botón "+"
3. Define nombre y descripción
4. Añade estadísticas personalizadas
5. Define reglas de progresión

### 2. Crear un Personaje

1. Ve a la pestaña "Personajes"
2. Toca el botón "+"
3. Selecciona un universo
4. Asigna nombre y estadísticas
5. Guarda el personaje

### 3. Usar el Asistente IA

1. Ve a la pestaña "IA"
2. Carga el modelo (~2GB primera vez)
3. Selecciona un personaje
4. Describe una acción
5. Aplica los cambios sugeridos

### 4. Compartir Fichas

1. En detalles del personaje, toca "Compartir"
2. Elige método de compartir
3. El código QR permite ver la ficha

## Scripts Disponibles

```bash
npm start           # Servidor de desarrollo
npm run build       # Build de producción
npm run lint        # Linter
npm run test        # Tests unitarios
```

## Solución de Problemas

### WebGPU no disponible
- Usa Chrome 113+ o Edge 113+
- Habilita WebGPU en `chrome://flags`

### Error de autenticación
- Verifica credenciales en `environment.ts`
- Habilita métodos de auth en Firebase Console

### Modelo no descarga
- Verifica conexión a internet
- Limpia caché del navegador

## Licencia

MIT License

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit (`git commit -m 'Añadir funcionalidad'`)
4. Push (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request
