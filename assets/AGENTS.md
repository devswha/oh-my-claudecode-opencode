# Assets

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode 설정 스키마를 OpenCode 형식으로 변환한 JSON 스키마. OMCO.schema.json은 oh-my-claudecode의 설정 스키마를 기반으로 하며, OpenCode 환경에 맞게 조정되었다. IDE 자동완성 및 검증 지원을 제공한다.

## Overview

This directory contains static project assets, primarily the JSON schema definition for OMCO configuration validation.

## Key Files

### `OMCO.schema.json`
**Purpose**: JSON Schema for configuration file validation
**Schema Version**: Draft-07
**Usage**: Provides IDE autocomplete and validation for `.opencode/OMCO.json`

## Schema Structure

### Root Configuration Object

The schema defines a comprehensive configuration structure for the OMCO plugin:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OMCO Configuration",
  "description": "Configuration schema for oh-my-claudecode-opencode (OMCO) plugin",
  "type": "object"
}
```

### Configuration Properties

#### `disabled_hooks`
**Type**: Array of strings
**Description**: List of hooks to disable
**Enum Values**:
- `todo-continuation-enforcer` - Disable TODO continuation prompts
- `keyword-detector` - Disable ultrawork/ralph keyword detection
- `ralph-loop` - Disable ralph-loop mode
- `session-recovery` - Disable session recovery
- `agent-usage-reminder` - Disable agent usage reminders

**Example**:
```json
{
  "disabled_hooks": ["todo-continuation-enforcer", "agent-usage-reminder"]
}
```

#### `background_task`
**Type**: Object
**Description**: Background task execution configuration

**Properties**:
- `max_concurrent` (integer, 1-10, default: 5)
  - Maximum concurrent background tasks

- `timeout_ms` (integer, 1000-600000, default: 300000)
  - Default timeout in milliseconds (5 minutes)

**Example**:
```json
{
  "background_task": {
    "max_concurrent": 3,
    "timeout_ms": 120000
  }
}
```

#### `ralph_loop`
**Type**: Object
**Description**: Ralph-loop persistence mode configuration

**Properties**:
- `max_iterations` (integer, 1-100, default: 50)
  - Maximum iterations before forced stop

- `idle_timeout_ms` (integer, 5000-300000, default: 30000)
  - Idle timeout before continuation prompt (30 seconds)

- `prd_path` (string, default: ".omc/prd.json")
  - Path to PRD file for structured tracking

**Example**:
```json
{
  "ralph_loop": {
    "max_iterations": 75,
    "idle_timeout_ms": 20000,
    "prd_path": ".omc/requirements.json"
  }
}
```

#### `todo_continuation`
**Type**: Object
**Description**: TODO continuation enforcer configuration

**Properties**:
- `idle_threshold_ms` (integer, 5000-120000, default: 15000)
  - Time before checking for incomplete TODOs (15 seconds)

- `reminder_interval_ms` (integer, 10000-300000)
  - Interval between reminder prompts

**Example**:
```json
{
  "todo_continuation": {
    "idle_threshold_ms": 10000,
    "reminder_interval_ms": 30000
  }
}
```

## IDE Integration

### VSCode Setup

Enable schema validation in VSCode:

1. **Option 1: In config file**
   ```json
   {
     "$schema": "node_modules/oh-my-claudecode-opencode/assets/OMCO.schema.json",
     "disabled_hooks": []
   }
   ```

2. **Option 2: In VSCode settings.json**
   ```json
   {
     "json.schemas": [
       {
         "fileMatch": [".opencode/OMCO.json"],
         "url": "./node_modules/oh-my-claudecode-opencode/assets/OMCO.schema.json"
       }
     ]
   }
   ```

### Benefits
- **Autocomplete**: IDE suggests valid property names
- **Validation**: Real-time error checking
- **Documentation**: Hover tooltips show property descriptions
- **Type checking**: Prevents invalid values (wrong types, out of range)

## Schema Validation Examples

### Valid Configuration
```json
{
  "$schema": "node_modules/oh-my-claudecode-opencode/assets/OMCO.schema.json",
  "disabled_hooks": ["agent-usage-reminder"],
  "background_task": {
    "max_concurrent": 8,
    "timeout_ms": 180000
  },
  "ralph_loop": {
    "max_iterations": 100,
    "idle_timeout_ms": 25000,
    "prd_path": ".omc/prd.json"
  },
  "todo_continuation": {
    "idle_threshold_ms": 20000
  }
}
```

### Invalid Examples

#### Out of Range
```json
{
  "background_task": {
    "max_concurrent": 15  // ❌ Max is 10
  }
}
```

#### Invalid Hook Name
```json
{
  "disabled_hooks": ["invalid-hook"]  // ❌ Not in enum
}
```

#### Wrong Type
```json
{
  "ralph_loop": {
    "max_iterations": "50"  // ❌ Should be integer, not string
  }
}
```

## Schema Maintenance

### Updating the Schema

When adding new config options:

1. **Add to Zod schema** (`src/config/index.ts`):
   ```typescript
   const ConfigSchema = z.object({
     new_feature: z.object({
       enabled: z.boolean().optional()
     }).optional()
   });
   ```

2. **Add to JSON schema** (`assets/OMCO.schema.json`):
   ```json
   {
     "properties": {
       "new_feature": {
         "type": "object",
         "properties": {
           "enabled": {
             "type": "boolean",
             "default": false
           }
         }
       }
     }
   }
   ```

3. **Update documentation** (this file)

4. **Add validation test** (`tests/config.test.ts`)

### Schema Versioning

- Schema follows JSON Schema Draft-07
- Breaking changes require major version bump
- New optional properties = minor version bump
- Clarifications/docs = patch version bump

## Package Export

The schema is exported via package.json:

```json
{
  "exports": {
    "./schema.json": "./assets/OMCO.schema.json"
  }
}
```

Usage in user projects:
```json
{
  "$schema": "node_modules/oh-my-claudecode-opencode/schema.json"
}
```

## Validation Tools

### Manual Validation

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate config
ajv validate \
  -s node_modules/oh-my-claudecode-opencode/assets/OMCO.schema.json \
  -d .opencode/OMCO.json
```

### Programmatic Validation

```typescript
import Ajv from 'ajv';
import schema from 'oh-my-claudecode-opencode/schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);

const config = { /* ... */ };
const valid = validate(config);

if (!valid) {
  console.error(validate.errors);
}
```

## Schema Features

### Property Constraints
- **Type enforcement**: string, integer, boolean, array, object
- **Range validation**: minimum, maximum for integers
- **Enum validation**: Fixed set of allowed values
- **Default values**: Auto-filled by IDE
- **Required properties**: Currently all optional

### Additional Validation
- `additionalProperties: false` - Prevent unknown properties
- Descriptions for all properties - IDE tooltips
- Default values documented - User guidance

## Common Patterns

### Timeout Configuration
All timeouts use milliseconds:
- 1000ms = 1 second
- 60000ms = 1 minute
- 300000ms = 5 minutes

### Iteration Limits
Prevent infinite loops:
- `max_iterations`: 1-100 (ralph-loop)
- `max_concurrent`: 1-10 (background tasks)

### Path Configuration
Use relative paths from project root:
- `.omc/prd.json` - PRD file
- `.omc/progress.txt` - Progress tracking

## Integration Points

- **Config Loader**: `/home/calvin/workspace/OMCO/src/config/` - Uses Zod for runtime validation
- **Documentation**: `/home/calvin/workspace/OMCO/docs/` - Schema usage in README
- **Tests**: `/home/calvin/workspace/OMCO/tests/` - Schema validation tests

## Future Enhancements

### Planned Schema Features
- **Agent-specific config**: Override settings per agent
- **Mode presets**: Predefined mode combinations
- **Notification settings**: Configure toast/prompt behavior
- **Logging config**: Debug levels, output formats
- **Performance tuning**: Token limits, parallelization settings

### Schema Improvements
- **$ref support**: Reusable schema definitions
- **Conditional schemas**: If/then/else validation
- **Pattern properties**: Dynamic property names
- **Dependencies**: Property interdependencies
- **Examples**: Inline config examples

## Dependencies

- None (pure JSON schema)

## Related Documentation

- [Config System](../src/config/AGENTS.md) - Runtime config loading
- [Documentation](../docs/AGENTS.md) - Usage examples
- [JSON Schema Spec](https://json-schema.org/draft-07/schema) - Schema reference
