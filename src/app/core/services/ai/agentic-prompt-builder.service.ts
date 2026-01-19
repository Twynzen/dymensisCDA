import { Injectable, inject } from '@angular/core';
import {
  PromptContext,
  BuiltPrompt,
  PromptTemplate,
  PromptTemplateId,
  PromptTemplateVariables,
  PromptBuilderConfig,
  DEFAULT_PROMPT_BUILDER_CONFIG,
  TokenBudget,
  DEFAULT_TOKEN_BUDGET_PERCENTAGES,
  FewShotExample,
  ConversationMessage
} from '../../models';
import { FormSchemaService } from './form-schema.service';

/**
 * AgenticPromptBuilderService
 * Builds context-aware, optimized prompts for LLM interactions
 * Manages token budgets for WebLLM's 4k context limit
 */
@Injectable({ providedIn: 'root' })
export class AgenticPromptBuilderService {
  private formSchemaService = inject(FormSchemaService);
  private config: PromptBuilderConfig = DEFAULT_PROMPT_BUILDER_CONFIG;

  /**
   * Prompt templates for different tasks
   */
  private readonly templates: Map<PromptTemplateId, PromptTemplate> = new Map([
    ['field_extraction', {
      id: 'field_extraction',
      name: 'Field Extraction',
      systemTemplate: `You are an AI assistant specialized in extracting structured data from natural language.
Your task is to identify and extract field values from the user's message.

Target entity type: {{entityType}}
Current phase: {{phase}}
Language: {{language}}

Fields to extract:
{{targetFieldsText}}

Instructions:
- Extract only the fields listed above
- Return values in the exact format specified for each field
- If a value is not clearly stated, return null
- Confidence should be 0.0-1.0 based on how explicitly the value was stated
- For names, look for quoted text or phrases after "llamado/a", "called", "named"`,
      userTemplate: `User message: "{{userMessage}}"

{{#if collectedDataJson}}
Already collected data:
{{collectedDataJson}}
{{/if}}

Extract fields as JSON:
{
  "fields": [
    {"field": "fieldName", "value": "extractedValue", "confidence": 0.9}
  ]
}`,
      expectedFormat: 'json',
      defaultMaxTokens: 500,
      defaultTemperature: 0.3,
      requiredVariables: ['userMessage', 'entityType', 'phase', 'language', 'targetFieldsText'],
      optionalVariables: ['collectedDataJson']
    }],

    ['json_generation', {
      id: 'json_generation',
      name: 'JSON Generation',
      systemTemplate: `You are an AI assistant that generates complete {{entityType}} entities in JSON format.
Generate a valid JSON object following the schema provided.

{{#if universeContext}}
Universe context:
{{universeContext}}
{{/if}}

Schema:
{{schemaText}}

Guidelines:
- Generate creative but coherent content
- Ensure all required fields are present
- Follow the validation rules for each field
- Use the provided language for text content: {{language}}`,
      userTemplate: `Based on the following collected information, generate a complete {{entityType}}:

{{collectedDataJson}}

{{#if examples}}
Examples:
{{#each examples}}
Input: {{this.input}}
Output: {{this.output}}
{{/each}}
{{/if}}

Generate the complete JSON:`,
      expectedFormat: 'json',
      defaultMaxTokens: 1500,
      defaultTemperature: 0.7,
      requiredVariables: ['entityType', 'schemaText', 'collectedDataJson', 'language'],
      optionalVariables: ['universeContext', 'examples']
    }],

    ['validation_correction', {
      id: 'validation_correction',
      name: 'Validation Correction',
      systemTemplate: `You are an AI assistant that fixes validation errors in JSON entities.
Your task is to correct the entity to pass validation while preserving the original intent.

Entity type: {{entityType}}
Language: {{language}}`,
      userTemplate: `Current entity:
{{currentEntityJson}}

Validation errors:
{{#each validationErrors}}
- {{this}}
{{/each}}

Fix the errors and return the corrected JSON:`,
      expectedFormat: 'json',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.3,
      requiredVariables: ['entityType', 'currentEntityJson', 'validationErrors', 'language'],
      optionalVariables: []
    }],

    ['clarification_question', {
      id: 'clarification_question',
      name: 'Clarification Question',
      systemTemplate: `You are a friendly assistant helping to create {{entityType}}s.
Generate a natural clarification question to gather missing information.

Language: {{language}}
Tone: Friendly, helpful, creative`,
      userTemplate: `Current phase: {{phase}}
Missing fields: {{missingFields}}
Already collected:
{{collectedDataJson}}

{{#if conversationText}}
Recent conversation:
{{conversationText}}
{{/if}}

Generate a single, natural question to ask the user:`,
      expectedFormat: 'text',
      defaultMaxTokens: 200,
      defaultTemperature: 0.8,
      requiredVariables: ['entityType', 'phase', 'missingFields', 'collectedDataJson', 'language'],
      optionalVariables: ['conversationText']
    }],

    ['edit_detection', {
      id: 'edit_detection',
      name: 'Edit Detection',
      systemTemplate: `You are an AI assistant that detects edit intentions from user messages.
Analyze the user's message and identify what fields they want to change.

Entity type: {{entityType}}
Language: {{language}}`,
      userTemplate: `Current entity:
{{currentEntityJson}}

User's edit request: "{{userMessage}}"

Identify the changes as JSON:
{
  "changes": [
    {"field": "fieldPath", "operation": "update|add|delete", "newValue": "value", "confidence": 0.9}
  ]
}`,
      expectedFormat: 'json',
      defaultMaxTokens: 500,
      defaultTemperature: 0.3,
      requiredVariables: ['entityType', 'currentEntityJson', 'userMessage', 'language'],
      optionalVariables: []
    }],

    ['contradiction_check', {
      id: 'contradiction_check',
      name: 'Contradiction Check',
      systemTemplate: `You are an AI assistant that detects contradictions in user input.
Check if new information contradicts previously collected data.`,
      userTemplate: `Previously collected data:
{{collectedDataJson}}

New input: "{{userMessage}}"

Check for contradictions and return:
{
  "hasContradictions": true/false,
  "contradictions": [
    {"field": "name", "oldValue": "X", "newValue": "Y", "severity": "high|medium|low"}
  ],
  "resolution": "ask_user|use_new|use_old"
}`,
      expectedFormat: 'json',
      defaultMaxTokens: 300,
      defaultTemperature: 0.2,
      requiredVariables: ['collectedDataJson', 'userMessage'],
      optionalVariables: []
    }],

    ['phase_guidance', {
      id: 'phase_guidance',
      name: 'Phase Guidance',
      systemTemplate: `You are a creative assistant helping users create {{entityType}}s.
Guide the user through the current phase with helpful suggestions.

Language: {{language}}
Current phase: {{phase}}`,
      userTemplate: `{{phaseInstructions}}

Already collected:
{{collectedDataJson}}

{{#if conversationText}}
Conversation so far:
{{conversationText}}
{{/if}}

Provide a helpful, engaging message to guide the user:`,
      expectedFormat: 'text',
      defaultMaxTokens: 300,
      defaultTemperature: 0.8,
      requiredVariables: ['entityType', 'phase', 'phaseInstructions', 'collectedDataJson', 'language'],
      optionalVariables: ['conversationText']
    }],

    ['entity_summary', {
      id: 'entity_summary',
      name: 'Entity Summary',
      systemTemplate: `You are an assistant that creates engaging summaries of {{entityType}}s.
Language: {{language}}`,
      userTemplate: `Summarize this {{entityType}} in 2-3 sentences:
{{currentEntityJson}}`,
      expectedFormat: 'text',
      defaultMaxTokens: 200,
      defaultTemperature: 0.7,
      requiredVariables: ['entityType', 'currentEntityJson', 'language'],
      optionalVariables: []
    }]
  ]);

  /**
   * Few-shot examples for common tasks
   */
  private readonly examples: FewShotExample[] = [
    // Universe creation examples - Spanish
    {
      input: 'Quiero crear un universo de fantasía llamado "Tierras Olvidadas"',
      output: '{"name": "Tierras Olvidadas", "theme": "fantasy"}',
      tags: ['universe', 'create', 'name', 'theme'],
      language: 'es'
    },
    {
      input: 'Un mundo cyberpunk donde la tecnología ha reemplazado la magia',
      output: '{"theme": "cyberpunk", "description": "Un mundo donde la tecnología ha reemplazado la magia"}',
      tags: ['universe', 'create', 'theme', 'description'],
      language: 'es'
    },
    // Character creation examples - Spanish
    {
      input: 'Mi personaje se llama "Elena" y es una guerrera elfa',
      output: '{"name": "Elena", "description": "Una guerrera elfa"}',
      tags: ['character', 'create', 'name', 'description'],
      language: 'es'
    },
    // Universe creation examples - English
    {
      input: 'I want to create a fantasy universe called "Forgotten Lands"',
      output: '{"name": "Forgotten Lands", "theme": "fantasy"}',
      tags: ['universe', 'create', 'name', 'theme'],
      language: 'en'
    },
    // Edit examples
    {
      input: 'Cambiar el nombre a "Nuevo Mundo"',
      output: '{"changes": [{"field": "name", "operation": "update", "newValue": "Nuevo Mundo"}]}',
      tags: ['edit', 'name'],
      language: 'es'
    }
  ];

  /**
   * Updates configuration
   */
  configure(config: Partial<PromptBuilderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Builds a complete prompt for the specified template
   */
  buildPrompt(templateId: PromptTemplateId, context: PromptContext): BuiltPrompt {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Calculate token budget
    const tokenBudget = this.calculateTokenBudget(this.config.maxContextTokens);

    // Build variables
    const variables = this.buildVariables(context, tokenBudget);

    // Generate prompts
    const systemPrompt = this.interpolateTemplate(template.systemTemplate, variables);
    const userPrompt = this.interpolateTemplate(template.userTemplate, variables);

    // Estimate tokens
    const estimatedInputTokens = this.estimateTokens(systemPrompt + userPrompt);

    return {
      systemPrompt,
      userPrompt,
      expectedFormat: template.expectedFormat,
      maxTokens: template.defaultMaxTokens,
      temperature: template.defaultTemperature,
      estimatedInputTokens
    };
  }

  /**
   * Builds a field extraction prompt
   */
  buildFieldExtractionPrompt(
    userInput: string,
    targetFields: string[],
    context: PromptContext
  ): BuiltPrompt {
    const schema = this.formSchemaService.getSchema(context.mode === 'action' ? 'universe' : context.mode as any);
    const fields = schema.fields.filter(f => targetFields.includes(f.name));

    const targetFieldsText = fields.map(f => {
      const hints = this.formSchemaService.getExtractionHintsForField(f, context.language);
      return `- ${f.name} (${f.type}): ${f.label[context.language]} [${hints.join(', ')}]`;
    }).join('\n');

    const enrichedContext: PromptContext = {
      ...context,
      collectedData: context.collectedData || {}
    };

    const variables: PromptTemplateVariables = {
      userMessage: userInput,
      targetFields: fields,
      targetFieldsText,
      collectedDataJson: this.compressData(context.collectedData || {}, 500)
    };

    return this.buildPromptWithVariables('field_extraction', enrichedContext, variables);
  }

  /**
   * Builds a JSON generation prompt
   */
  buildJsonGenerationPrompt(
    collectedData: Record<string, unknown>,
    context: PromptContext
  ): BuiltPrompt {
    const schema = this.formSchemaService.getSchema(context.mode === 'action' ? 'universe' : context.mode as any);
    const schemaText = this.formatSchemaForPrompt(schema, context.language);

    const variables: PromptTemplateVariables = {
      collectedDataJson: JSON.stringify(collectedData, null, 2),
      schemaText,
      examples: this.selectExamples(['create', context.mode], context.language),
      universeContext: context.universe
        ? this.compressData(context.universe as unknown as Record<string, unknown>, 500)
        : undefined
    };

    return this.buildPromptWithVariables('json_generation', context, variables);
  }

  /**
   * Builds a clarification question prompt
   */
  buildClarificationPrompt(
    missingFields: string[],
    context: PromptContext
  ): BuiltPrompt {
    const variables: PromptTemplateVariables = {
      missingFields: missingFields.join(', '),
      collectedDataJson: this.compressData(context.collectedData || {}, 300),
      conversationText: this.formatConversation(context.conversationHistory, 3)
    };

    return this.buildPromptWithVariables('clarification_question', context, variables);
  }

  /**
   * Builds an edit detection prompt
   */
  buildEditDetectionPrompt(
    userMessage: string,
    currentEntity: Record<string, unknown>,
    context: PromptContext
  ): BuiltPrompt {
    const variables: PromptTemplateVariables = {
      userMessage,
      currentEntityJson: this.compressData(currentEntity, 800)
    };

    return this.buildPromptWithVariables('edit_detection', context, variables);
  }

  /**
   * Compresses context to fit within token budget
   */
  compressContext(context: PromptContext, maxTokens: number): PromptContext {
    const compressed = { ...context };

    // Limit conversation history
    if (compressed.conversationHistory?.length > this.config.maxHistoryMessages) {
      compressed.conversationHistory = compressed.conversationHistory.slice(-this.config.maxHistoryMessages);
    }

    // Compress collected data
    if (compressed.collectedData) {
      const dataStr = JSON.stringify(compressed.collectedData);
      const dataTokens = this.estimateTokens(dataStr);

      if (dataTokens > maxTokens * 0.3) {
        // Keep only key fields
        const keyFields = ['name', 'description', 'theme'];
        compressed.collectedData = Object.fromEntries(
          Object.entries(compressed.collectedData).filter(([k]) => keyFields.includes(k))
        );
      }
    }

    return compressed;
  }

  /**
   * Estimates token count for a string
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.config.charsPerToken);
  }

  /**
   * Gets available templates
   */
  getAvailableTemplates(): PromptTemplateId[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Gets a specific template
   */
  getTemplate(id: PromptTemplateId): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Calculates token budget for each section
   */
  private calculateTokenBudget(totalTokens: number): TokenBudget {
    return {
      systemPrompt: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.systemPrompt),
      schema: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.schema),
      examples: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.examples),
      collectedData: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.collectedData),
      conversationHistory: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.conversationHistory),
      userPrompt: Math.floor(totalTokens * DEFAULT_TOKEN_BUDGET_PERCENTAGES.userPrompt)
    };
  }

  /**
   * Builds template variables from context
   */
  private buildVariables(context: PromptContext, budget: TokenBudget): PromptTemplateVariables {
    return {
      entityType: context.mode,
      phase: context.phase,
      language: context.language,
      collectedDataJson: this.compressData(context.collectedData || {}, budget.collectedData),
      currentEntityJson: context.currentEntity
        ? this.compressData(context.currentEntity as Record<string, unknown>, budget.collectedData)
        : undefined,
      conversationText: this.formatConversation(context.conversationHistory, this.config.maxHistoryMessages),
      universeContext: context.universe
        ? this.compressData(context.universe as unknown as Record<string, unknown>, budget.schema / 2)
        : undefined
    };
  }

  /**
   * Builds prompt with custom variables
   */
  private buildPromptWithVariables(
    templateId: PromptTemplateId,
    context: PromptContext,
    additionalVariables: PromptTemplateVariables
  ): BuiltPrompt {
    const template = this.templates.get(templateId)!;
    const budget = this.calculateTokenBudget(this.config.maxContextTokens);

    const variables: PromptTemplateVariables = {
      ...this.buildVariables(context, budget),
      ...additionalVariables,
      entityType: context.mode,
      phase: context.phase,
      language: context.language
    };

    const systemPrompt = this.interpolateTemplate(template.systemTemplate, variables);
    const userPrompt = this.interpolateTemplate(template.userTemplate, variables);

    return {
      systemPrompt,
      userPrompt,
      expectedFormat: template.expectedFormat,
      maxTokens: template.defaultMaxTokens,
      temperature: template.defaultTemperature,
      estimatedInputTokens: this.estimateTokens(systemPrompt + userPrompt)
    };
  }

  /**
   * Interpolates a template with variables
   */
  private interpolateTemplate(template: string, variables: PromptTemplateVariables): string {
    let result = template;

    // Simple variable replacement {{varName}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = (variables as Record<string, unknown>)[varName];
      if (value === undefined || value === null) return '';
      return String(value);
    });

    // Conditional blocks {{#if varName}}...{{/if}}
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
      const value = (variables as Record<string, unknown>)[varName];
      return value ? content : '';
    });

    // Each blocks {{#each varName}}...{{/each}}
    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, varName, content) => {
      const array = (variables as Record<string, unknown>)[varName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let itemContent = content;
        // Replace {{this.property}} with item property
        itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (_m: string, prop: string) => {
          return String((item as Record<string, unknown>)[prop] ?? '');
        });
        // Replace {{this}} with item itself
        itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        return itemContent;
      }).join('\n');
    });

    return result.trim();
  }

  /**
   * Compresses data to fit within token limit
   */
  private compressData(data: Record<string, unknown>, maxTokens: number): string {
    const fullJson = JSON.stringify(data, null, 2);
    const estimatedTokens = this.estimateTokens(fullJson);

    if (estimatedTokens <= maxTokens) {
      return fullJson;
    }

    // Compress by removing whitespace first
    const compactJson = JSON.stringify(data);
    if (this.estimateTokens(compactJson) <= maxTokens) {
      return compactJson;
    }

    // Keep only essential fields
    const essential = ['id', 'name', 'description', 'theme', 'type'];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => essential.includes(k) || typeof data[k] !== 'object')
    );

    return JSON.stringify(filtered);
  }

  /**
   * Formats conversation history for prompt
   */
  private formatConversation(history: ConversationMessage[], maxMessages: number): string {
    if (!history || history.length === 0) return '';

    const recent = history.slice(-maxMessages);
    return recent.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  /**
   * Formats schema for prompt inclusion
   */
  private formatSchemaForPrompt(schema: any, language: 'es' | 'en'): string {
    const fields = schema.fields.map((f: any) => {
      const label = f.label[language] || f.label.en;
      const required = f.validation?.required ? ' (required)' : '';
      const type = f.type;
      return `- ${f.name}: ${type}${required} - ${label}`;
    });

    return fields.join('\n');
  }

  /**
   * Selects relevant few-shot examples
   */
  private selectExamples(tags: string[], language: 'es' | 'en'): FewShotExample[] {
    return this.examples
      .filter(ex => ex.language === language)
      .filter(ex => tags.some(tag => ex.tags?.includes(tag)))
      .slice(0, this.config.maxExamples);
  }
}
