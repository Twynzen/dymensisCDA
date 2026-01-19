# Plan: Mejoras al Sistema de Creación con IA

## Problemas Identificados

### 1. Ficha Previa No Visible
- La IA extrae datos (nombre, stats) pero solo los muestra en texto conversacional
- No hay una tarjeta visual que se actualice en tiempo real
- El usuario no ve cómo va quedando su personaje/universo

### 2. Botón "SUBIR IMAGEN" No Desaparece
- Después de subir imagen, el botón sigue visible
- Debería mostrar la imagen subida y opción de cambiarla

### 3. Desbordamiento del Chat
- El área de input se desborda en la parte inferior
- Problemas de scroll y layout

### 4. Phi3 Solo Conversa, No Actúa
- El modelo responde con texto pero no ejecuta acciones
- Debería extraer y guardar datos estructurados automáticamente
- Falta feedback visual de qué campos se han llenado

### 5. Personajes Sin Universo - Problema Arquitectónico
- Un personaje REQUIERE un `universeId` para sus stats
- Si el usuario da stats sin universo, ¿qué hacemos?

---

## Solución Arquitectónica: Universo "Libre" o "Personal"

### Opción Recomendada: Universo Automático Personal

Cuando un usuario crea un personaje con stats personalizadas SIN seleccionar universo:

1. **Crear automáticamente un "Universo Personal"** para ese usuario
   - Nombre: "Universo Personal de [Usuario]" o "Mis Personajes"
   - Se crea una sola vez por usuario
   - Guarda las definiciones de stats que el usuario va usando

2. **Stats Dinámicas**
   - Si el usuario dice "Fuerza: 16, Resistencia: 15"
   - El sistema crea automáticamente las definiciones de esas stats en su universo personal
   - Valores por defecto: min=0, max=999, color automático

3. **Migración Posterior**
   - El usuario puede después "migrar" el personaje a un universo específico
   - O mantenerlo en su universo personal

### Estructura del Universo Personal:
```typescript
{
  id: 'personal-{userId}',
  name: 'Mis Creaciones',
  description: 'Universo personal para personajes sin mundo específico',
  createdBy: userId,
  isPersonal: true,  // Nueva flag
  statDefinitions: {}, // Se llena dinámicamente
  initialPoints: 100,
  awakeningSystem: { enabled: false }
}
```

---

## Plan de Implementación

### Fase 1: Ficha Previa en el Chat (Prioridad Alta)

**Objetivo**: Mostrar una tarjeta que se actualiza mientras el usuario da información

#### 1.1 Crear `LiveCharacterCardComponent`
```
src/app/modules/creation/ui/live-character-card.component.ts
```

- Similar a character-card pero para datos parciales
- Muestra: avatar (si hay), nombre, stats con barras
- Campos vacíos se muestran como "---" o placeholder
- Animación de "llenado" cuando se detecta un campo nuevo

#### 1.2 Integrar en el Chat
- Mostrar la tarjeta ARRIBA del input, debajo del último mensaje
- Se actualiza reactivamente cuando `collectedData` cambia
- Solo visible cuando hay al menos 1 campo llenado

#### 1.3 Señales Necesarias en CreationStore
```typescript
// Nuevo signal para datos en vivo
livePreviewData = signal<Partial<Character | Universe> | null>(null);

// Método para actualizar
updateLivePreview(data: Partial<Character | Universe>): void
```

### Fase 2: Arreglar Botón de Imagen

#### 2.1 Estado de Imagen Subida
```typescript
// En CreationStore o CreationService
uploadedImage = signal<string | null>(null);
```

#### 2.2 Lógica Condicional en Template
```html
@if (!uploadedImage()) {
  <ion-button fill="clear" (click)="triggerImageUpload()">
    <ion-icon slot="icon-only" name="image-outline"></ion-icon>
    SUBIR IMAGEN
  </ion-button>
} @else {
  <div class="uploaded-image-preview">
    <img [src]="uploadedImage()" />
    <ion-button fill="clear" size="small" (click)="removeImage()">
      <ion-icon slot="icon-only" name="close-circle"></ion-icon>
    </ion-button>
  </div>
}
```

### Fase 3: Arreglar Layout del Chat

#### 3.1 CSS Fixes
```css
ion-footer {
  position: sticky;
  bottom: 0;
}

.chat-container {
  padding-bottom: 120px; /* Espacio para el footer */
  overflow-y: auto;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  max-height: 150px;
}

ion-textarea {
  max-height: 100px;
  overflow-y: auto;
}
```

### Fase 4: Phi3 Más Acciones, Menos Conversación

#### 4.1 Mejorar Extracción en `IntentDetector`
- Después de cada mensaje, extraer TODOS los campos posibles
- Actualizar `livePreviewData` inmediatamente
- Mostrar indicador visual de campos detectados

#### 4.2 Prompts Más Directos
```typescript
// En lugar de:
"Ya tengo: nombre, stats. ¿Qué temática?"

// Usar:
"✓ Guardado: Arcadio (Fuerza 16, Resistencia 15, Velocidad 5)
Falta: Universo/Temática. ¿En qué mundo vive Arcadio?"
```

#### 4.3 Acciones Automáticas
- Si el usuario da nombre + stats + descripción → mostrar preview automático
- Si completeness > 80% → sugerir "¿Quieres ver cómo queda?"
- Reducir respuestas largas de la IA

### Fase 5: Sistema de Universo Personal

#### 5.1 Modificar Modelo Universe
```typescript
interface Universe {
  // ... campos existentes
  isPersonal?: boolean;  // true si es universo personal del usuario
}
```

#### 5.2 Crear/Obtener Universo Personal
```typescript
// En UniverseStore o FirebaseService
async getOrCreatePersonalUniverse(userId: string): Promise<Universe>
```

#### 5.3 Stats Dinámicas
```typescript
// Cuando el usuario da stats no definidas:
async addStatDefinitionToPersonalUniverse(
  userId: string,
  statName: string,
  defaultValue: number
): Promise<void>
```

#### 5.4 Flujo en CreationService
```typescript
async buildCharacterFromCollectedData(): Promise<Character> {
  let universeId = this.collectedData.universeId;

  // Si no hay universo pero hay stats personalizadas
  if (!universeId && this.collectedData.customStats) {
    const personalUniverse = await this.getOrCreatePersonalUniverse();
    universeId = personalUniverse.id;

    // Añadir definiciones de stats al universo personal
    await this.addCustomStatsToUniverse(personalUniverse, this.collectedData.customStats);
  }

  return {
    name: this.collectedData.name,
    universeId,
    stats: this.collectedData.customStats,
    // ...
  };
}
```

---

## Orden de Implementación Sugerido

1. **Fase 2**: Arreglar botón imagen (rápido, mejora UX inmediata)
2. **Fase 3**: Arreglar layout chat (rápido, mejora UX)
3. **Fase 1**: Ficha previa en chat (mediano, gran impacto visual)
4. **Fase 4**: Mejorar comportamiento Phi3 (mediano)
5. **Fase 5**: Universo personal (complejo, pero necesario)

---

## Archivos a Modificar/Crear

### Crear:
- `src/app/modules/creation/ui/live-character-card.component.ts`
- `src/app/modules/creation/ui/live-universe-card.component.ts`

### Modificar:
- `src/app/modules/creation/feature-creation-hub/creation-hub.component.ts`
  - Añadir lógica de imagen subida
  - Integrar live preview card
  - Arreglar CSS del footer

- `src/app/modules/creation/data-access/creation.store.ts`
  - Añadir signals: `uploadedImage`, `livePreviewData`

- `src/app/modules/creation/services/creation.service.ts`
  - Actualizar `livePreviewData` después de extracción
  - Lógica de universo personal

- `src/app/core/models/universe.model.ts`
  - Añadir `isPersonal?: boolean`

- `src/app/modules/universes/data-access/universe.store.ts`
  - Método `getOrCreatePersonalUniverse()`

---

## Preguntas para el Usuario

1. ¿Quieres que el "Universo Personal" sea visible en la lista de universos o esté oculto?

2. ¿Los personajes del universo personal pueden tener sistema de despertar (ranks E-S)?

3. ¿Prefieres que la ficha previa aparezca:
   - A) Flotando sobre el chat (siempre visible)
   - B) Como un mensaje especial en el chat (se scrollea)
   - C) En un panel lateral (solo desktop)

4. ¿Cuándo debe aparecer la ficha previa?
   - A) Desde el primer dato (nombre)
   - B) Cuando hay al menos 2-3 campos
   - C) Solo cuando hay nombre + stats
