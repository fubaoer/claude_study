## ADDED Requirements

### Requirement: Remove duplicate openspec skills
The system SHALL remove the 4 `openspec-*` skill directories from `.claude/skills/` that are superseded by `opsx:*` commands.

#### Scenario: openspec-propose skill removed
- **WHEN** the cleanup is executed
- **THEN** `.claude/skills/openspec-propose/` directory no longer exists

#### Scenario: openspec-apply-change skill removed
- **WHEN** the cleanup is executed
- **THEN** `.claude/skills/openspec-apply-change/` directory no longer exists

#### Scenario: openspec-explore skill removed
- **WHEN** the cleanup is executed
- **THEN** `.claude/skills/openspec-explore/` directory no longer exists

#### Scenario: openspec-archive-change skill removed
- **WHEN** the cleanup is executed
- **THEN** `.claude/skills/openspec-archive-change/` directory no longer exists

### Requirement: Remove unused image caption skill
The system SHALL remove the `sn-da-image-caption` skill directory from `.claude/skills/`.

#### Scenario: sn-da-image-caption skill removed
- **WHEN** the cleanup is executed
- **THEN** `.claude/skills/sn-da-image-caption/` directory no longer exists

### Requirement: opsx commands remain functional
After cleanup, all `opsx:*` commands SHALL continue to work without modification.

#### Scenario: opsx:propose remains available
- **WHEN** user invokes `/opsx:propose`
- **THEN** the command executes normally using `.claude/commands/opsx/propose.md`

#### Scenario: opsx:apply remains available
- **WHEN** user invokes `/opsx:apply`
- **THEN** the command executes normally using `.claude/commands/opsx/apply.md`

#### Scenario: opsx:explore remains available
- **WHEN** user invokes `/opsx:explore`
- **THEN** the command executes normally using `.claude/commands/opsx/explore.md`

#### Scenario: opsx:archive remains available
- **WHEN** user invokes `/opsx:archive`
- **THEN** the command executes normally using `.claude/commands/opsx/archive.md`
