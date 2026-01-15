import { Injectable, inject } from '@angular/core';
import { Universe, Character } from '../../../core/models';
import { UniverseStore } from '../../universes/data-access/universe.store';

@Injectable({ providedIn: 'root' })
export class RagContextService {
  private universeStore = inject(UniverseStore);

  /**
   * Conocimiento base sobre el sistema completo
   */
  getSystemKnowledge(): string {
    return `
###CONOCIMIENTO DEL SISTEMA - DYMENSIS CDA###

Eres un asistente de creación para Dymensis CDA, un sistema de gestión de personajes RPG.
Tu rol es guiar al usuario en la creación de universos y personajes de forma conversacional.

###CAPACIDADES###
1. Crear universos con reglas de progresión personalizadas
2. Crear personajes dentro de universos existentes
3. Analizar acciones para ajustar estadísticas de personajes
4. Procesar imágenes que el usuario suba (avatares, escenarios, presentaciones)

###MANEJO DE IMÁGENES###
Cuando el usuario suba una imagen, DEBES preguntar su propósito:
- "¿Esta imagen es para un PERSONAJE (avatar), un LUGAR del universo, o la PRESENTACIÓN del universo?"
- Según la respuesta, asignarás la imagen al campo correcto:
  * Avatar de personaje → character.avatar.photoUrl
  * Lugar del universo → universe.locations[].imageUrl
  * Presentación del universo → universe.coverImage

###ESTILO DE CONVERSACIÓN###
- Sé amigable y entusiasta, como un Game Master guiando a un jugador
- Haz preguntas específicas para obtener detalles
- Ofrece sugerencias creativas basadas en lo que el usuario describe
- Confirma entendimiento antes de generar contenido final
`;
  }

  /**
   * Conocimiento detallado para crear universos
   */
  getUniverseCreationKnowledge(): string {
    const existingUniverses = this.universeStore.allUniverses();
    const examplesSection = existingUniverses.length > 0
      ? this.formatExistingUniverses(existingUniverses)
      : this.getDefaultUniverseExamples();

    return `
###CONOCIMIENTO PARA CREAR UNIVERSOS###

Un UNIVERSO define las reglas de un mundo RPG completo.

###ESTRUCTURA DE UN UNIVERSO###
{
  "name": string,                    // Nombre único del universo
  "description": string,             // Descripción del mundo (2-4 oraciones)
  "coverImage": string | null,       // URL de imagen de presentación
  "statDefinitions": {               // Estadísticas disponibles (4-8 stats)
    "stat_key": {
      "name": string,                // Nombre completo (ej: "Fuerza")
      "abbreviation": string,        // 3 letras (ej: "STR")
      "icon": string,                // Ionicon (ej: "barbell")
      "minValue": number,            // Típicamente 1
      "maxValue": number,            // 100-999 según el estilo
      "defaultValue": number,        // Valor inicial (5-20)
      "category": "primary",
      "color": string                // Color hex (ej: "#FF5722")
    }
  },
  "progressionRules": [              // Reglas de cómo las acciones afectan stats
    {
      "id": string,
      "keywords": string[],          // Palabras clave que activan la regla
      "affectedStats": string[],     // Stats que pueden aumentar
      "maxChangePerAction": number,  // 1-5 típicamente
      "description": string          // Descripción para el usuario
    }
  ],
  "awakeningSystem": {               // Sistema de rangos
    "enabled": boolean,
    "levels": string[],              // ["E", "D", "C", "B", "A", "S", "SS", "SSS"]
    "thresholds": number[]           // [0, 50, 100, 200, 350, 500, 700, 900]
  },
  "locations": [                     // Lugares importantes del universo
    {
      "name": string,
      "description": string,
      "imageUrl": string | null
    }
  ]
}

###ICONOS DISPONIBLES PARA STATS###
- Fuerza/Combate: "barbell", "fitness", "hand-left"
- Agilidad/Velocidad: "flash", "rocket", "walk"
- Resistencia/Vida: "heart", "shield", "pulse"
- Inteligencia/Magia: "bulb", "book", "school"
- Percepción: "eye", "search", "scan"
- Carisma/Social: "chatbubbles", "people", "happy"
- Suerte: "dice", "star", "sparkles"
- Especiales: "flame", "water", "leaf", "snow"

###COLORES SUGERIDOS###
- Rojo (#F44336): Fuerza, fuego, combate
- Naranja (#FF9800): Energía, vitalidad
- Amarillo (#FFEB3B): Inteligencia, luz
- Verde (#4CAF50): Vida, naturaleza, curación
- Azul (#2196F3): Magia, agua, sabiduría
- Púrpura (#9C27B0): Misterio, oscuridad
- Cyan (#00BCD4): Velocidad, tecnología
- Rosa (#E91E63): Carisma, encanto

${examplesSection}

###FLUJO DE CONVERSACIÓN PARA UNIVERSOS###

1. INICIO: Pregunta qué tipo de mundo quiere crear
   - "¿Qué tipo de mundo tienes en mente? ¿Fantasía, ciencia ficción, post-apocalíptico...?"

2. TEMÁTICA: Profundiza en la temática
   - "¿Hay alguna obra que te inspire? ¿Solo Leveling, D&D, Cyberpunk...?"

3. ESTADÍSTICAS: Define los stats
   - "¿Qué estadísticas son importantes? ¿Las clásicas RPG o algo más específico?"

4. RANGOS: Sistema de poder
   - "¿Cómo funcionan los rangos de poder? ¿E-S estilo Solo Leveling o niveles 1-100?"

5. REGLAS: Cómo progresar
   - "¿Qué tipos de acciones deberían mejorar las estadísticas?"

6. IMÁGENES (si el usuario sube):
   - "¡Genial! ¿Esta imagen es para la presentación del universo o representa un lugar específico?"

7. GENERACIÓN: Genera el universo completo en JSON
`;
  }

  /**
   * Conocimiento para crear personajes
   */
  getCharacterCreationKnowledge(universe?: Universe): string {
    const availableUniverses = this.universeStore.allUniverses();

    let universeSection = '';
    if (universe) {
      universeSection = this.formatUniverseForCharacter(universe);
    } else if (availableUniverses.length > 0) {
      universeSection = `
###UNIVERSOS DISPONIBLES###
${availableUniverses.map(u => `- "${u.name}": ${u.description}`).join('\n')}

Pregunta al usuario en qué universo quiere crear el personaje.
`;
    } else {
      universeSection = `
###SIN UNIVERSOS###
El usuario no tiene universos creados. Sugiere crear uno primero o usa un universo genérico de fantasía.
`;
    }

    return `
###CONOCIMIENTO PARA CREAR PERSONAJES###

Un PERSONAJE pertenece a un universo y tiene estadísticas según ese universo.

###ESTRUCTURA DE UN PERSONAJE###
{
  "name": string,                    // Nombre del personaje
  "description": string,             // Descripción breve (1-2 oraciones)
  "backstory": string,               // Historia de fondo (2-4 oraciones)
  "universeId": string,              // ID del universo al que pertenece
  "avatar": {
    "photoUrl": string | null,       // URL de imagen del personaje
    "backgroundColor": string        // Color de fondo si no hay imagen
  },
  "stats": {                         // Valores de cada stat del universo
    "stat_key": number
  },
  "progression": {
    "level": number,                 // Nivel inicial (1-10)
    "experience": number,            // XP acumulada
    "awakening": string,             // Rango actual ("E", "D", etc.)
    "title": string | null           // Título especial (ej: "El Novato")
  },
  "skills": [],                      // Habilidades especiales
  "personalityTraits": string[]      // Rasgos de personalidad
}

${universeSection}

###FLUJO DE CONVERSACIÓN PARA PERSONAJES###

1. UNIVERSO: Confirma el universo
   - Si hay varios: "¿En qué universo quieres crear tu personaje?"
   - Si hay uno: "¿Quieres crear un personaje en [nombre del universo]?"

2. CONCEPTO: Pide la idea general
   - "Cuéntame sobre tu personaje. ¿Qué tipo de héroe (o villano) es?"

3. TRASFONDO: Historia y motivación
   - "¿Cuál es su historia? ¿Qué lo motiva?"

4. ESPECIALIDAD: Enfoque de stats
   - "¿En qué destaca? ¿Combate, magia, sigilo, liderazgo...?"

5. NIVEL INICIAL: Poder de partida
   - "¿Es un novato que recién empieza o ya tiene experiencia?"

6. IMÁGENES (si el usuario sube):
   - "¡Perfecto! Esta será la imagen de avatar de tu personaje."

7. GENERACIÓN: Genera el personaje en JSON con stats balanceados
`;
  }

  /**
   * Conocimiento para analizar acciones
   */
  getActionAnalysisKnowledge(character: Character, universe: Universe): string {
    return `
###CONOCIMIENTO PARA ANALIZAR ACCIONES###

Analiza acciones del personaje y sugiere cambios de estadísticas.

###PERSONAJE ACTUAL###
Nombre: ${character.name}
Nivel: ${character.progression.level}
Rango: ${character.progression.awakening}
Stats actuales:
${Object.entries(character.stats).map(([key, val]) => {
  const def = universe.statDefinitions[key];
  return `- ${def?.name || key}: ${val}/${def?.maxValue || 999}`;
}).join('\n')}

###REGLAS DE PROGRESIÓN DEL UNIVERSO###
${universe.progressionRules.map(r =>
  `- "${r.description}": keywords [${r.keywords.join(', ')}] → [${r.affectedStats.join(', ')}] (max +${r.maxChangePerAction})`
).join('\n')}

###INSTRUCCIONES###
1. Lee la acción que describe el usuario
2. Identifica keywords que coincidan con las reglas
3. Sugiere aumentos SOLO para stats permitidos
4. NO excedas el máximo de cambio por regla
5. Responde en JSON con el formato:
{
  "analysis": "breve análisis de la acción",
  "stat_changes": [
    {"stat": "stat_key", "change": 1-5, "reason": "razón"}
  ],
  "confidence": 0.0-1.0
}
`;
  }

  /**
   * Instrucciones específicas para manejo de imágenes
   */
  getImageHandlingInstructions(): string {
    return `
###MANEJO DE IMÁGENES EN CONVERSACIÓN###

Cuando detectes que el usuario ha subido una imagen, sigue este flujo:

1. RECONOCE la imagen:
   "¡Veo que has subido una imagen! Déjame ayudarte a usarla correctamente."

2. PREGUNTA el propósito según el contexto:

   Si estás creando un UNIVERSO:
   - "¿Esta imagen es para la PRESENTACIÓN del universo o representa un LUGAR específico?"
   - Si es presentación → asigna a coverImage
   - Si es lugar → pregunta el nombre y descripción del lugar → agrega a locations[]

   Si estás creando un PERSONAJE:
   - "¿Esta imagen es el AVATAR de tu personaje?"
   - Normalmente sí → asigna a avatar.photoUrl
   - Si no → pregunta para qué es

3. CONFIRMA la asignación:
   - "Perfecto, he guardado la imagen como [tipo]. ¡Se ve genial!"

4. CONTINÚA el flujo normal de creación

###EJEMPLO DE DIÁLOGO CON IMAGEN###

Usuario: [sube imagen de un bosque oscuro]
IA: "¡Veo que has subido una imagen de lo que parece un bosque oscuro!
     ¿Esta imagen es para la presentación del universo o representa un lugar específico
     como un dungeon o zona de entrenamiento?"

Usuario: "Es el Bosque de las Sombras donde entrenan los cazadores"
IA: "Excelente! He guardado esta imagen como el 'Bosque de las Sombras',
     un lugar de entrenamiento en tu universo. ¿Quieres agregar más detalles sobre este lugar?"
`;
  }

  /**
   * Prompt completo para generación de universo
   */
  buildUniverseGenerationPrompt(): string {
    return `
${this.getSystemKnowledge()}
${this.getUniverseCreationKnowledge()}
${this.getImageHandlingInstructions()}

###TU TAREA###
Guía al usuario para crear un universo. Haz preguntas conversacionales.
Cuando tengas suficiente información, genera el JSON completo del universo.

IMPORTANTE: El JSON debe estar en un bloque marcado con \`\`\`json ... \`\`\`
`;
  }

  /**
   * Prompt completo para generación de personaje
   */
  buildCharacterGenerationPrompt(universe?: Universe): string {
    return `
${this.getSystemKnowledge()}
${this.getCharacterCreationKnowledge(universe)}
${this.getImageHandlingInstructions()}

###TU TAREA###
Guía al usuario para crear un personaje. Haz preguntas conversacionales.
Cuando tengas suficiente información, genera el JSON completo del personaje.

IMPORTANTE: El JSON debe estar en un bloque marcado con \`\`\`json ... \`\`\`
`;
  }

  // Helper methods
  private formatExistingUniverses(universes: Universe[]): string {
    if (universes.length === 0) return '';

    return `
###UNIVERSOS EXISTENTES DEL USUARIO (para referencia)###
${universes.slice(0, 3).map(u => `
**${u.name}**
Stats: ${Object.keys(u.statDefinitions).join(', ')}
Rangos: ${u.awakeningSystem?.levels.join(' → ')}
`).join('\n')}
`;
  }

  private getDefaultUniverseExamples(): string {
    return `
###EJEMPLOS DE UNIVERSOS###

**1. Solo Leveling Style**
Stats: Fuerza, Agilidad, Vitalidad, Inteligencia, Percepción, Sentido
Rangos: E → D → C → B → A → S → Nacional → SSS
Reglas:
- Entrenamiento físico → Fuerza, Vitalidad
- Combate en dungeons → Fuerza, Agilidad
- Estudio de habilidades → Inteligencia
- Meditación → Percepción, Sentido

**2. Fantasía Clásica (D&D Style)**
Stats: STR, DEX, CON, INT, WIS, CHA
Rangos: Niveles 1-20
Reglas:
- Combate físico → STR, CON
- Acrobacias/sigilo → DEX
- Estudio arcano → INT
- Oración/naturaleza → WIS
- Diplomacia → CHA

**3. Cyberpunk**
Stats: Cuerpo, Reflejos, Tech, Cool, Inteligencia, Empatía
Rangos: Street → Pro → Elite → Leyenda
Reglas:
- Combate callejero → Cuerpo, Reflejos
- Hackeo → Tech, Inteligencia
- Negociación → Cool, Empatía
`;
  }

  private formatUniverseForCharacter(universe: Universe): string {
    return `
###UNIVERSO SELECCIONADO: ${universe.name}###
${universe.description}

Stats disponibles:
${Object.entries(universe.statDefinitions).map(([key, def]) =>
  `- ${def.name} (${def.abbreviation}): min ${def.minValue}, max ${def.maxValue}, default ${def.defaultValue}`
).join('\n')}

Rangos: ${universe.awakeningSystem?.levels.join(' → ')}
Thresholds de poder total: ${universe.awakeningSystem?.thresholds.join(', ')}

Los stats del personaje deben usar EXACTAMENTE estas keys: ${Object.keys(universe.statDefinitions).join(', ')}
`;
  }
}
