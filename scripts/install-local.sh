#!/bin/bash
# Install local development build to OpenCode plugin directory

set -e

PLUGIN_DIR="$HOME/.config/opencode/node_modules/oh-my-claudecode-opencode"

echo "Building..."
bun run build

echo "Copying to $PLUGIN_DIR..."
cp -r dist/ "$PLUGIN_DIR/dist/"
cp -r assets/ "$PLUGIN_DIR/assets/"
cp package.json "$PLUGIN_DIR/package.json"

echo "Verifying..."
SKILL_COUNT=$(ls "$PLUGIN_DIR/assets/skills/" | wc -l)
VERSION=$(grep '"version"' "$PLUGIN_DIR/package.json" | head -1 | sed 's/.*: "\(.*\)".*/\1/')

echo ""
echo "=== Installation Complete ==="
echo "Version: $VERSION"
echo "Skills: $SKILL_COUNT"
echo ""
echo "Restart OpenCode to apply changes."
