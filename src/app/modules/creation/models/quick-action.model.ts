/**
 * Types of quick actions that can be executed in the creation flow
 */
export type ActionType =
  | 'execute'   // Execute a function directly
  | 'input'     // Send text as user input
  | 'confirm'   // Confirmation action (yes/no)
  | 'navigate'  // Navigate to a route
  | 'edit'      // Open edit mode
  | 'generate'; // Trigger AI generation

/**
 * Color variants for quick action buttons
 */
export type ActionColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'tertiary';

/**
 * Quick action interface for executable actions in the creation flow
 */
export interface QuickAction {
  /** Unique identifier for the action */
  id: string;

  /** Display label for the action button */
  label: string;

  /** Optional icon name (Ionicons) */
  icon?: string;

  /** Type of action to execute */
  type: ActionType;

  /** Handler function for 'execute' type actions */
  handler?: () => Promise<void> | void;

  /** Text to send as input for 'input' type actions */
  inputText?: string;

  /** Route to navigate to for 'navigate' type actions */
  route?: string;

  /** Button color variant */
  color?: ActionColor;

  /** Whether the action is disabled */
  disabled?: boolean;

  /** Optional tooltip or description */
  tooltip?: string;
}

/**
 * Creates a simple input action (sends text as user message)
 */
export function createInputAction(label: string, inputText?: string): QuickAction {
  return {
    id: crypto.randomUUID(),
    label,
    type: 'input',
    inputText: inputText ?? label
  };
}

/**
 * Creates an execute action with a custom handler
 */
export function createExecuteAction(
  label: string,
  handler: () => Promise<void> | void,
  options?: { icon?: string; color?: ActionColor }
): QuickAction {
  return {
    id: crypto.randomUUID(),
    label,
    type: 'execute',
    handler,
    icon: options?.icon,
    color: options?.color
  };
}

/**
 * Creates a confirm action
 */
export function createConfirmAction(
  label: string,
  handler: () => Promise<void> | void
): QuickAction {
  return {
    id: crypto.randomUUID(),
    label,
    type: 'confirm',
    handler,
    icon: 'checkmark-circle-outline',
    color: 'success'
  };
}

/**
 * Creates a generate action that triggers AI generation
 */
export function createGenerateAction(
  label: string,
  handler: () => Promise<void> | void
): QuickAction {
  return {
    id: crypto.randomUUID(),
    label,
    type: 'generate',
    handler,
    icon: 'sparkles-outline',
    color: 'tertiary'
  };
}

/**
 * Converts a string array to QuickAction array (for backwards compatibility)
 */
export function stringsToQuickActions(strings: string[]): QuickAction[] {
  return strings.map(str => createInputAction(str));
}

/**
 * Type guard to check if an action is a QuickAction or string
 */
export function isQuickAction(action: QuickAction | string): action is QuickAction {
  return typeof action === 'object' && 'type' in action && 'label' in action;
}
