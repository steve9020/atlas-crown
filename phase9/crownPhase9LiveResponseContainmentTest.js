'use strict';

/**
 * Crown Phase 9 — Live Response Path Authority Containment Test
 * Verifies non-widening, freeze/contain behavior, and that no route/output authority is granted.
 */

const { evaluateLiveResponseContainment, shouldContain, SCHEMA, PHASE } = require('../crown_modules/CrownLiveResponseContainment');

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function run() {
  // Case 1: all pass → allow
  const pass = evaluateLiveResponseContainment({
    source_text: 'ordinary reflection',
    input_validation: { passed: true },
    governance: { approved: true, blocked: false },
    quality: { passed: true }
  });
  assert(pass.schema === SCHEMA, 'schema');
  assert(pass.phase === PHASE, 'phase');
  assert(pass.status === 'PASS', 'expected PASS');
  assert(pass.action === 'allow', 'expected allow');
  assert(pass.route_authority === false, 'route_authority must stay false');
  assert(pass.output_authority === false, 'output_authority must stay false');
  assert(pass.authority_widened === false, 'authority_widened must be false');
  assert(!shouldContain(pass), 'should not contain on PASS');

  // Case 2: governance blocked → contain
  const blocked = evaluateLiveResponseContainment({
    source_text: 'test',
    input_validation: { passed: true },
    governance: { approved: false, blocked: true, rule: 'test_rule' },
    quality: { passed: true }
  });
  assert(blocked.status === 'FAIL', 'expected FAIL on blocked governance');
  assert(blocked.action === 'contain', 'expected contain');
  assert(shouldContain(blocked), 'shouldContain true');
  assert(blocked.route_authority === false && blocked.output_authority === false, 'no authority on contain');

  // Case 3: quality unknown → freeze
  const unknown = evaluateLiveResponseContainment({
    source_text: 'test',
    input_validation: { passed: true },
    governance: { approved: true, blocked: false },
    quality: {}  // no passed flag → UNKNOWN
  });
  assert(unknown.status === 'UNKNOWN', 'expected UNKNOWN');
  assert(unknown.action === 'freeze', 'expected freeze');
  assert(shouldContain(unknown), 'shouldContain on freeze');
  assert(unknown.authority_widened === false, 'no widening on freeze');

  // Case 4: input boundary issue → contain
  const boundary = evaluateLiveResponseContainment({
    source_text: 'crisis material',
    input_validation: { passed: false, boundary: { issue: 'crisis' } },
    governance: { approved: true },
    quality: { passed: true }
  });
  assert(boundary.status === 'FAIL', 'boundary issue should FAIL');
  assert(boundary.action === 'contain', 'boundary issue should contain');

  console.log('crownPhase9LiveResponseContainmentTest: PASS');
  return true;
}

if (require.main === module) {
  run();
}

module.exports = { run };
