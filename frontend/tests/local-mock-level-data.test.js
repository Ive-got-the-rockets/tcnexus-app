import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mockApi = readFileSync(new URL('../mock-api/server.js', import.meta.url), 'utf8');

test('local Mastering the Greeks data exposes all three course levels', () => {
  assert.match(
    mockApi,
    /title: 'Mastering the Greeks',[\s\S]*?configured_levels: \['beginner', 'intermediate', 'advanced'\][\s\S]*?level_lesson_counts: \{ beginner: 3, intermediate: 1, advanced: 4 \}/,
    'Mastering the Greeks must explicitly expose Beginner, Intermediate, and Advanced'
  );
});

test('course detail count is sourced from the selected variant', () => {
  assert.match(mockApi, /lesson_count: course\.level_lesson_counts\?\.\[slug\] \?\? course\.lesson_count/);
});

test('mock API preserves explicitly configured levels instead of inferring only from category tags', () => {
  assert.match(
    mockApi,
    /const configuredLevels = Array\.isArray\(course\.configured_levels\)[\s\S]*?\? course\.configured_levels[\s\S]*?: inferredLevels;/,
    'explicit configured_levels must take precedence over inferred course type levels'
  );
});
