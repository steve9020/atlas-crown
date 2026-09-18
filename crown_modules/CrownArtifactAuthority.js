'use strict';
function verifyArtifactAuthority(input = {}) {
  const required = Array.isArray(input.required_files) ? input.required_files : [];
  const observed = input.observed_files && typeof input.observed_files === 'object' ? input.observed_files : {};
  const expected = input.expected_hashes && typeof input.expected_hashes === 'object' ? input.expected_hashes : {};
  const missing = required.filter(p => !observed[p]);
  const mismatched = required.filter(p => expected[p] && observed[p] && observed[p].sha256 !== expected[p]);
  const packageBound = Boolean(input.package_sha256) && input.package_sha256 === input.claimed_package_sha256;
  const proofBound = input.atlas_proof === 'PASS' &&
    input.crown_closure === 'PASS' &&
    input.mutation_pack === 'PASS' &&
    input.frontend_zero_diff === true;
  const status = missing.length || mismatched.length || !packageBound || !proofBound ? 'FAIL' : 'PASS';
  return Object.freeze({
    status,
    missing:Object.freeze(missing),
    mismatched:Object.freeze(mismatched),
    keeper_eligible:status === 'PASS',
    route_authority:false,
    output_authority:false
  });
}
module.exports={verifyArtifactAuthority};
