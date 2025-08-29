# Frontend Development Standards

This document captures the comprehensive frontend development standards, patterns, and practices derived from the Project Lite codebase. Use these guidelines to maintain consistency across frontend projects.

## Project Setup and Build Tools

### Package Manager
- **Use pnpm** as the package manager (not npm or yarn)
- Leverage pnpm workspaces for monorepo structures when applicable
- Lock file: `pnpm-lock.yaml` must be committed

### Build Tooling
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

- **Vite** for development server and production builds
- **SWC** via `@vitejs/plugin-react-swc` for fast TypeScript/JSX transpilation
- TypeScript compilation before Vite build ensures type safety
- Minimal Vite configuration - rely on sensible defaults

### Development Environment
- ES2022 target for modern JavaScript features
- ESNext module system
- Bundler mode module resolution
- React 19+ with automatic JSX runtime

## TypeScript Configuration

### Compiler Options
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

### Type Patterns
- **Prefer type inference** over explicit typing when obvious
- **Use Zod for runtime validation** with inferred TypeScript types
- **Single source of truth**: Define schemas once, infer types from them
- **Avoid duplicate type definitions**

#### Example: Zod Schema with Type Inference
```typescript
// Define schema once
export const WorkItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"])
});

// Infer type from schema
export type WorkItem = z.infer<typeof WorkItemSchema>;

// Extended types for UI needs
export interface WorkItemWithChildren extends WorkItem {
  children: WorkItemWithChildren[];
}
```

## React Patterns

### Component Structure
- **Function components only** - no class components (except error boundaries)
- **Named exports for components** from barrel exports (`index.ts`)
- **Co-locate component files** with their types and tests

#### File Organization
```
src/
  components/
    ComponentName/
      ComponentName.tsx      # Main component
      index.ts              # Barrel export
      types.ts              # Component-specific types (if needed)
```

### Import Patterns
```typescript
// Prefer named imports with type keyword
import React, { useState, useMemo, useEffect, type JSX } from "react";

// Group imports logically
import { Schema, type TypeName } from "./schemas";
import { ComponentA, ComponentB } from "./components";
import { utilityFunction } from "./utils";
```

### State Management
- **Component-level state** with `useState` for local UI state
- **Custom hooks** for reusable stateful logic
- **Context API** for cross-component state when needed
- **No external state management libraries** unless absolutely necessary

#### Custom Hook Pattern
```typescript
export function useLocalStorage() {
  const saveToStorage = useCallback((data: Data): void => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save:', error);
    }
  }, []);

  return { saveToStorage };
}
```

### Component Patterns

#### Defensive Rendering
```typescript
const Component: React.FC<Props> = ({ data }) => {
  // Guard against invalid data
  if (!data || !data.id) {
    return <div>Invalid data</div>;
  }
  
  // Safe property access
  const items = data.items || [];
  
  return <div>{/* render */}</div>;
};
```

#### Inline Conditional Components
```typescript
{isEditing ? (
  <EditForm item={item} onSave={handleSave} />
) : (
  <DisplayView item={item} />
)}
```

#### Event Handler Naming
```typescript
// Prefix with "handle" for internal handlers
const handleClick = () => {};
const handleSubmit = () => {};

// Prefix with "on" for props
<Component onClick={handleClick} onSubmit={handleSubmit} />
```

## Styling with Tailwind CSS

### Configuration
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'media',  // Automatic dark mode based on system preference
  theme: { extend: {} },
  plugins: []
}
```

### CSS Structure
- **Single entry point**: `src/index.css` with Tailwind directives
- **No component-specific CSS files**
- **Inline Tailwind classes** for all styling
- **PostCSS with Autoprefixer** for vendor prefixes

### Tailwind Patterns

#### Responsive Design
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

#### Dark Mode Support
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
```

#### State-based Styling
```tsx
<button className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
```

#### Dynamic Classes
```typescript
// Use utility functions for dynamic classes
const getStatusColor = (status: Status): string => {
  const colors: Record<Status, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700"
  };
  return colors[status] || "bg-gray-100";
};
```

## Data Validation with Zod

### Schema Definition Patterns
```typescript
// Composable schemas
const BaseSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string()
});

const ExtendedSchema = BaseSchema.extend({
  name: z.string(),
  status: z.enum(["active", "inactive"])
});

// Optional with defaults
const ConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  limit: z.number().min(0).optional()
});
```

### Validation Pattern
```typescript
const handleDataLoad = (rawData: unknown) => {
  const validation = Schema.safeParse(rawData);
  
  if (!validation.success) {
    const errors = validation.error.issues.map(
      err => `${err.path.join('.')}: ${err.message}`
    );
    setError(errors.join('\n'));
    return;
  }
  
  setData(validation.data);
};
```

## Error Handling

### Error Boundaries
```typescript
// Class component for error boundaries (only exception to function component rule)
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught:", error, errorInfo);
  }
}
```

### Try-Catch Patterns
```typescript
// Always handle errors gracefully
try {
  const data = JSON.parse(content);
  processData(data);
} catch (error) {
  console.warn('Failed to parse:', error);
  // Provide fallback behavior
}
```

## File and Code Organization

### Directory Structure
```
src/
  components/       # Reusable UI components
  context/         # React Context providers
  hooks/           # Custom React hooks
  pages/           # Page-level components
  schemas/         # Zod schemas and types
  services/        # External service integrations
  utils/           # Utility functions
  App.tsx         # Root application component
  main.tsx        # Application entry point
  index.css       # Global styles with Tailwind
```

### Export Patterns
```typescript
// Barrel exports in index.ts
export { default as ComponentName } from './ComponentName';
export * from './types';

// Named exports for utilities
export { functionA, functionB } from './utils';
```

### Import Order
1. React and third-party libraries
2. Absolute imports from src
3. Relative imports (types, components, utils)
4. Static assets

## Component Composition

### Container/Presentational Pattern
```typescript
// Container component (handles logic)
const WorkItemContainer: React.FC = () => {
  const [data, setData] = useState<Data>();
  const handleUpdate = () => { /* logic */ };
  
  return <WorkItemDisplay data={data} onUpdate={handleUpdate} />;
};

// Presentational component (pure UI)
const WorkItemDisplay: React.FC<Props> = ({ data, onUpdate }) => {
  return <div>{/* pure rendering */}</div>;
};
```

### Compound Components
```typescript
// Parent provides context
const Modal = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return <ModalContext.Provider value={{ isOpen }}>{children}</ModalContext.Provider>;
};

// Children consume context
Modal.Header = ({ children }) => { /* ... */ };
Modal.Body = ({ children }) => { /* ... */ };
Modal.Footer = ({ children }) => { /* ... */ };
```

## Performance Optimization

### Memoization
```typescript
// Use useMemo for expensive computations
const hierarchicalData = useMemo(() => {
  return buildHierarchy(flatData);
}, [flatData]);

// Use useCallback for stable function references
const handleClick = useCallback((id: string) => {
  // handle click
}, [dependency]);
```

### Lazy Loading
```typescript
// Code splitting for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// With Suspense boundary
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## Icons and Assets

### Lucide React Icons
```typescript
import { ChevronDown, Save, X } from "lucide-react";

// Consistent sizing with Tailwind classes
<ChevronDown className="w-4 h-4" />
<Save className="w-5 h-5" />
```

## Forms and Inputs

### Controlled Components
```typescript
const [value, setValue] = useState("");

<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full p-2 border border-gray-300 rounded"
/>
```

### Form Validation
```typescript
// Inline validation
const isValid = value.trim().length > 0;

<button 
  disabled={!isValid}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  Submit
</button>
```

## Code Style Guidelines

### General Principles
- **No unnecessary comments** - code should be self-documenting
- **Concise, readable code** over clever abstractions
- **Early returns** to reduce nesting
- **Destructuring** for cleaner prop access
- **Template literals** for string concatenation

### Naming Conventions
- **PascalCase** for components and types
- **camelCase** for functions, variables, and props
- **SCREAMING_SNAKE_CASE** for constants
- **Descriptive names** over abbreviations

### TypeScript Specifics
- Use `type` for object shapes and unions
- Use `interface` only when extending or implementing
- Prefer `const` assertions for literal types
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Testing Philosophy
While not explicitly shown in the codebase, follow these principles:
- Test user behavior, not implementation details
- Focus on integration tests over unit tests
- Use React Testing Library for component tests
- Mock external dependencies at the service boundary

## Performance Best Practices

### Rendering Optimization
- Keep component trees shallow
- Split large components into smaller, focused ones
- Use React.memo sparingly and only when measured
- Avoid inline object/array creation in props

### State Updates
- Batch state updates when possible
- Use functional updates for state derived from previous state
- Keep state as close to where it's used as possible

## Accessibility (Implied Standards)

### ARIA and Semantic HTML
- Use semantic HTML elements (`button`, `nav`, `main`, etc.)
- Add `aria-label` for icon-only buttons
- Include `title` attributes for tooltips
- Ensure keyboard navigation works

### Focus Management
- Visible focus indicators
- Logical tab order
- Auto-focus for modals and overlays

## Security Considerations

### Data Handling
- Always validate external data with Zod
- Sanitize user input before display
- Use try-catch blocks for JSON parsing
- Never trust client-side validation alone

### Storage
- Clear sensitive data from localStorage on logout
- Handle storage quota exceeded errors
- Provide fallbacks when storage is unavailable

## Development Workflow

### Git Commit Messages
- Use conventional commits format
- Present tense, imperative mood
- Reference issue numbers when applicable

### Code Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Zod schemas validate all external data
- [ ] Error states are handled gracefully
- [ ] Dark mode styles are included
- [ ] Responsive design is implemented
- [ ] No console.log statements in production code
- [ ] Components are properly memoized if needed

## Dependency Management

### Core Dependencies
```json
{
  "react": "^19.x",
  "react-dom": "^19.x",
  "zod": "^4.x",
  "lucide-react": "latest"
}
```

### Development Dependencies
```json
{
  "@vitejs/plugin-react-swc": "^4.x",
  "vite": "^7.x",
  "typescript": "~5.8.x",
  "tailwindcss": "^4.x",
  "@tailwindcss/postcss": "^4.x",
  "autoprefixer": "^10.x",
  "eslint": "^9.x"
}
```

### Dependency Guidelines
- Minimize external dependencies
- Prefer well-maintained, popular packages
- Regular updates for security patches
- Lock versions for production stability

## Migration Guide

When applying these standards to existing projects:

1. **Start with tooling**: Update build tools and TypeScript config
2. **Add Tailwind CSS**: Install and configure for styling
3. **Implement Zod schemas**: Add validation for external data
4. **Refactor components**: Convert to function components with hooks
5. **Extract utilities**: Create helper functions and custom hooks
6. **Add error boundaries**: Wrap main sections for resilience
7. **Update imports**: Use barrel exports and proper organization

## Example Component Following All Standards

```typescript
import React, { useState, useMemo, useCallback } from 'react';
import { Save, X } from 'lucide-react';
import { WorkItemSchema, type WorkItem } from '../schemas';
import { buildHierarchy, getStatusColor } from '../utils';

interface WorkItemCardProps {
  item: WorkItem;
  onSave: (item: WorkItem) => void;
  onCancel: () => void;
}

export const WorkItemCard: React.FC<WorkItemCardProps> = ({ 
  item, 
  onSave, 
  onCancel 
}) => {
  const [editedItem, setEditedItem] = useState(item);
  
  const isValid = useMemo(() => {
    const result = WorkItemSchema.safeParse(editedItem);
    return result.success;
  }, [editedItem]);
  
  const handleSave = useCallback(() => {
    if (isValid) {
      onSave(editedItem);
    }
  }, [editedItem, isValid, onSave]);
  
  const handleFieldChange = useCallback((
    field: keyof WorkItem, 
    value: WorkItem[keyof WorkItem]
  ) => {
    setEditedItem(prev => ({ ...prev, [field]: value }));
  }, []);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          value={editedItem.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded"
        />
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="p-2 text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Save changes"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-2 text-red-600 hover:text-red-700"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={`inline-block px-2 py-1 rounded text-xs ${getStatusColor(editedItem.status)}`}>
        {editedItem.status}
      </div>
    </div>
  );
};

export default WorkItemCard;
```

## Conclusion

These standards represent battle-tested patterns for building maintainable, performant, and user-friendly React applications. They emphasize:

- **Type safety** through TypeScript and Zod
- **Performance** through proper React patterns
- **Consistency** through established conventions
- **Maintainability** through clear organization
- **User experience** through responsive design and error handling

Apply these standards consistently to create robust frontend applications that scale well and remain maintainable over time.