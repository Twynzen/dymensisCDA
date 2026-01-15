/**
 * Sistema de Fases para Creación de Universos y Personajes
 *
 * Cada fase tiene:
 * - Nombre y descripción
 * - Preguntas específicas cuantitativas
 * - Campos que recolecta
 * - Prompt especializado para el RAG
 * - Validación de completitud
 */

export interface CreationPhaseQuestion {
  id: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
  required: boolean;
  field: string; // Campo en el que se guardará la respuesta
}

export interface CreationPhase {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: CreationPhaseQuestion[];
  ragPrompt: string;
  suggestedResponses: string[];
  validationRules: string[];
}

// ============================================
// FASES PARA CREACIÓN DE UNIVERSOS
// ============================================

export const UNIVERSE_CREATION_PHASES: CreationPhase[] = [
  {
    id: 'concept',
    name: 'Concepto General',
    description: 'Define la esencia y temática del universo',
    icon: 'bulb',
    questions: [
      {
        id: 'name',
        question: '¿Cómo se llama tu universo?',
        type: 'text',
        placeholder: 'Ej: Mundo de los Cazadores',
        required: true,
        field: 'name'
      },
      {
        id: 'theme',
        question: '¿Qué tipo de mundo es?',
        type: 'select',
        options: ['Fantasía épica', 'Ciencia ficción', 'Post-apocalíptico', 'Urbano fantástico', 'Steampunk', 'Cyberpunk', 'Histórico', 'Otro'],
        required: true,
        field: 'theme'
      },
      {
        id: 'inspiration',
        question: '¿Hay alguna obra que te inspire? (Solo Leveling, D&D, etc.)',
        type: 'text',
        placeholder: 'Ej: Solo Leveling + The Witcher',
        required: false,
        field: 'inspiration'
      },
      {
        id: 'description',
        question: 'Describe brevemente tu mundo (2-3 oraciones)',
        type: 'text',
        placeholder: 'Ej: Un mundo donde aparecieron dungeons y los humanos despertaron poderes...',
        required: true,
        field: 'description'
      }
    ],
    ragPrompt: `
###FASE: CONCEPTO GENERAL###
Tu objetivo es recopilar información básica sobre el universo:
- Nombre del universo
- Temática general (fantasía, sci-fi, etc.)
- Inspiraciones
- Descripción corta

Haz preguntas claras y específicas. Una vez tengas toda la información, confirma y pasa a la siguiente fase.
`,
    suggestedResponses: [
      'Fantasía estilo Solo Leveling',
      'Cyberpunk futurista',
      'D&D clásico medieval',
      'Mundo post-apocalíptico'
    ],
    validationRules: ['name', 'theme', 'description']
  },
  {
    id: 'races',
    name: 'Razas y Especies',
    description: 'Define las razas que habitan tu mundo',
    icon: 'people',
    questions: [
      {
        id: 'raceCount',
        question: '¿Cuántas razas jugables hay en tu universo?',
        type: 'number',
        placeholder: 'Ej: 5',
        required: true,
        field: 'raceCount'
      },
      {
        id: 'races',
        question: 'Nombra las razas principales',
        type: 'text',
        placeholder: 'Ej: Humanos, Elfos, Enanos, Orcos, Demonios',
        required: true,
        field: 'races'
      },
      {
        id: 'raceDetails',
        question: '¿Las razas tienen bonificaciones especiales a stats?',
        type: 'select',
        options: ['Sí, cada raza tiene bonificaciones', 'No, todas son iguales', 'Solo algunas razas tienen bonificaciones'],
        required: true,
        field: 'raceHasBonuses'
      }
    ],
    ragPrompt: `
###FASE: RAZAS Y ESPECIES###
Tu objetivo es definir las razas del universo:
1. Pregunta ESPECÍFICAMENTE cuántas razas hay (número exacto)
2. Pide los nombres de cada raza
3. Pregunta si las razas afectan las estadísticas

Para cada raza mencionada, puedes sugerir características basadas en arquetipos comunes.
Ejemplo: "Los elfos suelen tener +10% a Agilidad e Inteligencia"

Una vez tengas la información, genera un resumen estructurado.
`,
    suggestedResponses: [
      'Solo humanos',
      '3 razas básicas',
      '5 razas principales',
      'Muchas razas (8+)'
    ],
    validationRules: ['raceCount', 'races']
  },
  {
    id: 'statistics',
    name: 'Sistema de Estadísticas',
    description: 'Define los atributos que tendrán los personajes',
    icon: 'stats-chart',
    questions: [
      {
        id: 'statCount',
        question: '¿Cuántas estadísticas principales tendrán los personajes?',
        type: 'number',
        placeholder: 'Ej: 6 (recomendado 4-8)',
        required: true,
        field: 'statCount'
      },
      {
        id: 'statNames',
        question: 'Nombra las estadísticas',
        type: 'text',
        placeholder: 'Ej: Fuerza, Agilidad, Vitalidad, Inteligencia, Percepción, Carisma',
        required: true,
        field: 'statNames'
      },
      {
        id: 'statMax',
        question: '¿Cuál es el valor máximo de una estadística?',
        type: 'select',
        options: ['100 (simple)', '200 (moderado)', '500 (amplio)', '999 (Solo Leveling)', 'Otro'],
        required: true,
        field: 'statMaxValue'
      },
      {
        id: 'statDefault',
        question: '¿Cuál es el valor inicial promedio?',
        type: 'select',
        options: ['5 (débil)', '10 (normal)', '20 (competente)', '50 (veterano)'],
        required: true,
        field: 'statDefaultValue'
      }
    ],
    ragPrompt: `
###FASE: SISTEMA DE ESTADÍSTICAS###
Tu objetivo es definir las estadísticas del universo:

1. CANTIDAD: Pregunta cuántas estadísticas habrá (recomendado 4-8)
2. NOMBRES: Pide los nombres de cada stat
3. RANGOS: Define valor mínimo, máximo y por defecto

Para cada estadística, sugiere:
- Abreviatura (3 letras): STR, AGI, VIT, INT, PER, CHA
- Icono recomendado: barbell, flash, heart, bulb, eye, chatbubbles
- Color representativo: #F44336 (rojo), #03A9F4 (azul), etc.

IMPORTANTE: Genera las definiciones en formato estructurado:
{
  "strength": { "name": "Fuerza", "abbreviation": "STR", "icon": "barbell", "color": "#F44336", "minValue": 1, "maxValue": 999, "defaultValue": 10 }
}
`,
    suggestedResponses: [
      '6 stats clásicas (STR, AGI, VIT, INT, PER, CHA)',
      '4 stats simples',
      'Stats de Solo Leveling',
      'Personalizadas'
    ],
    validationRules: ['statCount', 'statNames', 'statMaxValue']
  },
  {
    id: 'progression',
    name: 'Sistema de Progresión',
    description: 'Define cómo los personajes se vuelven más fuertes',
    icon: 'trending-up',
    questions: [
      {
        id: 'levelSystem',
        question: '¿Hay sistema de niveles?',
        type: 'select',
        options: ['Sí, niveles numéricos (1-100)', 'Sí, niveles con nombres (Novato, Experto...)', 'No, solo stats'],
        required: true,
        field: 'hasLevels'
      },
      {
        id: 'rankSystem',
        question: '¿Hay sistema de rangos de poder?',
        type: 'select',
        options: ['E-D-C-B-A-S (Solo Leveling)', 'Bronce-Plata-Oro-Platino-Diamante', 'Nivel 1-20 (D&D)', 'Personalizado', 'No hay rangos'],
        required: true,
        field: 'rankSystem'
      },
      {
        id: 'progressionTypes',
        question: '¿Qué tipos de acciones mejoran las estadísticas?',
        type: 'multiselect',
        options: ['Entrenamiento físico', 'Combate', 'Estudio/Magia', 'Exploración', 'Interacción social', 'Meditación', 'Misiones/Quests'],
        required: true,
        field: 'progressionTypes'
      }
    ],
    ragPrompt: `
###FASE: SISTEMA DE PROGRESIÓN###
Tu objetivo es definir cómo progresan los personajes:

1. NIVELES: ¿Hay niveles? ¿Cuántos? ¿Cómo se suben?
2. RANGOS: ¿Hay rangos de poder? (E, D, C, B, A, S, SS, SSS)
3. THRESHOLDS: ¿Qué total de stats se necesita para cada rango?
4. REGLAS: ¿Qué acciones mejoran qué estadísticas?

Para las REGLAS DE PROGRESIÓN, define:
- Keywords que activan la regla (ej: "entrenar", "correr", "pesas")
- Stats afectados (ej: strength, vitality)
- Máximo de puntos por acción (1-5)

Genera las reglas en formato:
{
  "id": "physical_training",
  "keywords": ["entrenar", "ejercicio", "correr", "pesas"],
  "affectedStats": ["strength", "vitality"],
  "maxChangePerAction": 3,
  "description": "Entrenamiento físico"
}
`,
    suggestedResponses: [
      'Sistema E-S de Solo Leveling',
      'Niveles 1-100',
      'Sin niveles, solo stats',
      'Rangos personalizados'
    ],
    validationRules: ['rankSystem', 'progressionTypes']
  },
  {
    id: 'appearance',
    name: 'Apariencia y Presentación',
    description: 'Define el aspecto visual del universo',
    icon: 'color-wand',
    questions: [
      {
        id: 'coverImage',
        question: '¿Tienes una imagen para la portada del universo?',
        type: 'text',
        placeholder: 'Puedes subir una imagen o describir la escena',
        required: false,
        field: 'coverImage'
      },
      {
        id: 'colorScheme',
        question: '¿Qué paleta de colores representa tu mundo?',
        type: 'select',
        options: ['Oscuro/Épico (púrpuras, negros)', 'Brillante/Fantasía (dorados, azules)', 'Natural (verdes, marrones)', 'Futurista (neones, cyan)', 'Apocalíptico (rojos, naranjas)'],
        required: false,
        field: 'colorScheme'
      },
      {
        id: 'locations',
        question: '¿Cuántos lugares importantes quieres definir?',
        type: 'number',
        placeholder: 'Ej: 3',
        required: false,
        field: 'locationCount'
      }
    ],
    ragPrompt: `
###FASE: APARIENCIA Y PRESENTACIÓN###
Tu objetivo es definir el aspecto visual:

1. IMAGEN DE PORTADA: Pregunta si quieren subir una imagen
2. PALETA DE COLORES: Sugiere colores basados en la temática
3. LUGARES: ¿Hay lugares importantes que definir?

Si el usuario sube una imagen, pregunta:
- "¿Esta imagen es la portada del universo o representa un lugar específico?"

Para cada lugar, pide:
- Nombre
- Descripción breve
- Imagen (opcional)
`,
    suggestedResponses: [
      'Subir imagen de portada',
      'Definir lugares importantes',
      'Usar colores por defecto',
      'Saltar esta fase'
    ],
    validationRules: []
  },
  {
    id: 'review',
    name: 'Revisión Final',
    description: 'Revisa y confirma la creación del universo',
    icon: 'checkmark-circle',
    questions: [],
    ragPrompt: `
###FASE: REVISIÓN FINAL###
Genera el JSON COMPLETO del universo con toda la información recopilada.

El JSON debe incluir:
- name, description
- statDefinitions (con TODOS los campos: name, abbreviation, icon, color, minValue, maxValue, defaultValue, category)
- progressionRules (con keywords, affectedStats, maxChangePerAction, description)
- awakeningSystem (enabled, levels, thresholds)
- locations (si hay)

Presenta un RESUMEN visual al usuario y pregunta si quiere:
1. Confirmar y guardar
2. Ajustar algo específico
3. Regenerar desde cero
`,
    suggestedResponses: [
      '¡Perfecto, guárdalo!',
      'Quiero ajustar las estadísticas',
      'Quiero ajustar los rangos',
      'Empezar de nuevo'
    ],
    validationRules: []
  }
];

// ============================================
// FASES PARA CREACIÓN DE PERSONAJES
// ============================================

export const CHARACTER_CREATION_PHASES: CreationPhase[] = [
  {
    id: 'universe_selection',
    name: 'Selección de Universo',
    description: 'Elige el universo donde vivirá tu personaje',
    icon: 'planet',
    questions: [
      {
        id: 'universeId',
        question: '¿En qué universo quieres crear tu personaje?',
        type: 'select',
        options: [], // Se llenan dinámicamente con los universos del usuario
        required: true,
        field: 'universeId'
      }
    ],
    ragPrompt: `
###FASE: SELECCIÓN DE UNIVERSO###
El personaje debe pertenecer a un universo existente.

1. Lista los universos disponibles del usuario
2. Explica brevemente qué ofrece cada uno (stats, rangos)
3. Si no hay universos, sugiere crear uno primero

Una vez seleccionado, CARGA las estadísticas de ese universo para usarlas en las siguientes fases.
`,
    suggestedResponses: [], // Se llenan dinámicamente
    validationRules: ['universeId']
  },
  {
    id: 'identity',
    name: 'Identidad',
    description: 'Define quién es tu personaje',
    icon: 'person',
    questions: [
      {
        id: 'name',
        question: '¿Cómo se llama tu personaje?',
        type: 'text',
        placeholder: 'Ej: Kira Shadowbane',
        required: true,
        field: 'name'
      },
      {
        id: 'race',
        question: '¿A qué raza pertenece?',
        type: 'select',
        options: [], // Se llenan según el universo
        required: false,
        field: 'race'
      },
      {
        id: 'class',
        question: '¿Cuál es su rol o clase?',
        type: 'text',
        placeholder: 'Ej: Cazador, Mago, Guerrero, Asesino',
        required: false,
        field: 'class'
      },
      {
        id: 'description',
        question: 'Describe a tu personaje en 1-2 oraciones',
        type: 'text',
        placeholder: 'Ej: Un joven cazador que despertó poderes de sombra...',
        required: true,
        field: 'description'
      }
    ],
    ragPrompt: `
###FASE: IDENTIDAD###
Recopila información básica del personaje:

1. NOMBRE: Pide un nombre que encaje con el universo
2. RAZA: Si el universo tiene razas, ofrece las opciones
3. CLASE/ROL: ¿Qué tipo de personaje es?
4. DESCRIPCIÓN: Breve resumen de quién es

Sugiere nombres basados en la temática del universo si el usuario no tiene ideas.
`,
    suggestedResponses: [
      'Guerrero/Luchador',
      'Mago/Hechicero',
      'Cazador/Ranger',
      'Asesino/Rogue'
    ],
    validationRules: ['name', 'description']
  },
  {
    id: 'backstory',
    name: 'Historia de Fondo',
    description: 'Define el pasado y motivaciones del personaje',
    icon: 'book',
    questions: [
      {
        id: 'origin',
        question: '¿De dónde viene tu personaje?',
        type: 'text',
        placeholder: 'Ej: Un pequeño pueblo destruido por monstruos',
        required: false,
        field: 'origin'
      },
      {
        id: 'motivation',
        question: '¿Qué lo motiva? ¿Cuál es su objetivo?',
        type: 'text',
        placeholder: 'Ej: Venganza, proteger a los débiles, volverse el más fuerte',
        required: true,
        field: 'motivation'
      },
      {
        id: 'backstory',
        question: 'Cuéntame su historia (2-4 oraciones)',
        type: 'text',
        placeholder: 'Ej: Después de perder a su familia, juró...',
        required: true,
        field: 'backstory'
      }
    ],
    ragPrompt: `
###FASE: HISTORIA DE FONDO###
Crea un trasfondo rico para el personaje:

1. ORIGEN: ¿De dónde viene?
2. MOTIVACIÓN: ¿Qué busca? ¿Qué lo impulsa?
3. EVENTOS CLAVE: ¿Qué le pasó para llegar aquí?

Ofrece arquetipos comunes si el usuario necesita inspiración:
- El Vengador: Perdió algo y busca justicia
- El Elegido: Tiene un destino especial
- El Renegado: Huyó de su pasado
- El Novato: Apenas comienza su aventura
`,
    suggestedResponses: [
      'Busca venganza',
      'Quiere proteger a otros',
      'Busca poder y gloria',
      'Simplemente sobrevivir'
    ],
    validationRules: ['motivation', 'backstory']
  },
  {
    id: 'statistics',
    name: 'Estadísticas',
    description: 'Asigna los valores de atributos del personaje',
    icon: 'stats-chart',
    questions: [
      {
        id: 'statFocus',
        question: '¿En qué se especializa tu personaje?',
        type: 'multiselect',
        options: [], // Se llenan según las stats del universo
        required: true,
        field: 'statFocus'
      },
      {
        id: 'powerLevel',
        question: '¿Qué tan fuerte es al comenzar?',
        type: 'select',
        options: ['Muy débil (principiante absoluto)', 'Débil (tiene potencial)', 'Promedio (competente)', 'Fuerte (veterano)', 'Muy fuerte (élite)'],
        required: true,
        field: 'powerLevel'
      },
      {
        id: 'startingRank',
        question: '¿Cuál es su rango inicial?',
        type: 'select',
        options: [], // Se llenan según los rangos del universo
        required: true,
        field: 'startingRank'
      }
    ],
    ragPrompt: `
###FASE: ESTADÍSTICAS###
Asigna valores numéricos basados en el universo seleccionado.

USA LAS ESTADÍSTICAS DEL UNIVERSO (del contexto):
${'{universeStats}'}

1. ESPECIALIZACIÓN: ¿En qué stats destaca?
2. DEBILIDADES: ¿Dónde es débil?
3. NIVEL DE PODER: ¿Qué tan fuerte comienza?

GENERA STATS BALANCEADOS según el nivel de poder:
- Muy débil: 80% del defaultValue
- Débil: 100% del defaultValue
- Promedio: 120% del defaultValue
- Fuerte: 150% del defaultValue
- Muy fuerte: 200% del defaultValue

Las especializaciones añaden +20-50% a esos stats.
Las debilidades restan -20-30% a esos stats.
`,
    suggestedResponses: [
      'Especialista en combate físico',
      'Especialista en magia',
      'Equilibrado en todo',
      'Muy rápido pero frágil'
    ],
    validationRules: ['statFocus', 'powerLevel', 'startingRank']
  },
  {
    id: 'appearance',
    name: 'Apariencia',
    description: 'Define cómo se ve tu personaje',
    icon: 'image',
    questions: [
      {
        id: 'avatar',
        question: '¿Tienes una imagen para el avatar?',
        type: 'text',
        placeholder: 'Puedes subir una imagen o describirlo',
        required: false,
        field: 'avatarUrl'
      },
      {
        id: 'backgroundColor',
        question: '¿Qué color representa a tu personaje?',
        type: 'select',
        options: ['Rojo (#F44336)', 'Azul (#2196F3)', 'Verde (#4CAF50)', 'Púrpura (#9C27B0)', 'Dorado (#FFD700)', 'Negro (#333333)', 'Personalizado'],
        required: false,
        field: 'backgroundColor'
      },
      {
        id: 'physicalDescription',
        question: 'Describe su apariencia física (opcional)',
        type: 'text',
        placeholder: 'Ej: Alto, cabello negro, cicatriz en el ojo izquierdo',
        required: false,
        field: 'physicalDescription'
      }
    ],
    ragPrompt: `
###FASE: APARIENCIA###
Define el aspecto visual del personaje:

1. AVATAR: ¿Hay imagen? Si suben una, ASÍGNALA a avatar.photoUrl
2. COLOR: ¿Qué color de fondo si no hay imagen?
3. DESCRIPCIÓN FÍSICA: Rasgos distintivos

Si el usuario sube una imagen, confirma:
"¡Genial! He guardado esta imagen como el avatar de tu personaje."
`,
    suggestedResponses: [
      'Subir imagen de avatar',
      'Usar color por defecto',
      'Describir apariencia',
      'Saltar esta fase'
    ],
    validationRules: []
  },
  {
    id: 'personality',
    name: 'Personalidad',
    description: 'Define el carácter y rasgos del personaje',
    icon: 'heart',
    questions: [
      {
        id: 'traits',
        question: '¿Qué rasgos de personalidad tiene?',
        type: 'multiselect',
        options: ['Valiente', 'Cauteloso', 'Leal', 'Solitario', 'Carismático', 'Frío', 'Compasivo', 'Ambicioso', 'Honorable', 'Astuto'],
        required: true,
        field: 'personalityTraits'
      },
      {
        id: 'title',
        question: '¿Tiene algún título o apodo?',
        type: 'text',
        placeholder: 'Ej: El Lobo Solitario, Sombra Carmesí',
        required: false,
        field: 'title'
      }
    ],
    ragPrompt: `
###FASE: PERSONALIDAD###
Define el carácter del personaje:

1. RASGOS: 2-4 rasgos de personalidad
2. TÍTULO: ¿Tiene un apodo o título?

Sugiere rasgos que complementen la historia de fondo:
- Un vengador podría ser: Determinado, Frío, Solitario
- Un protector podría ser: Valiente, Leal, Compasivo
`,
    suggestedResponses: [
      'Valiente y leal',
      'Frío y calculador',
      'Carismático y astuto',
      'Solitario pero honorable'
    ],
    validationRules: ['personalityTraits']
  },
  {
    id: 'review',
    name: 'Revisión Final',
    description: 'Revisa y confirma la creación del personaje',
    icon: 'checkmark-circle',
    questions: [],
    ragPrompt: `
###FASE: REVISIÓN FINAL###
Genera el JSON COMPLETO del personaje con toda la información.

El JSON debe incluir:
- name, description, backstory
- universeId
- avatar { photoUrl, backgroundColor }
- stats (usando las keys del universo)
- progression { level, experience, awakening, title }
- personalityTraits

Presenta un RESUMEN visual y pregunta:
1. Confirmar y guardar
2. Ajustar algo
3. Regenerar
`,
    suggestedResponses: [
      '¡Perfecto, guárdalo!',
      'Ajustar estadísticas',
      'Cambiar historia',
      'Empezar de nuevo'
    ],
    validationRules: []
  }
];

// ============================================
// UTILIDADES
// ============================================

export function getPhaseById(phases: CreationPhase[], id: string): CreationPhase | undefined {
  return phases.find(p => p.id === id);
}

export function getNextPhase(phases: CreationPhase[], currentId: string): CreationPhase | undefined {
  const currentIndex = phases.findIndex(p => p.id === currentId);
  if (currentIndex === -1 || currentIndex >= phases.length - 1) return undefined;
  return phases[currentIndex + 1];
}

export function getPreviousPhase(phases: CreationPhase[], currentId: string): CreationPhase | undefined {
  const currentIndex = phases.findIndex(p => p.id === currentId);
  if (currentIndex <= 0) return undefined;
  return phases[currentIndex - 1];
}

export function calculatePhaseProgress(phases: CreationPhase[], currentId: string): number {
  const currentIndex = phases.findIndex(p => p.id === currentId);
  if (currentIndex === -1) return 0;
  return ((currentIndex + 1) / phases.length) * 100;
}

export function isPhaseComplete(phase: CreationPhase, collectedData: Record<string, any>): boolean {
  return phase.validationRules.every(field => {
    const value = collectedData[field];
    return value !== undefined && value !== null && value !== '';
  });
}
