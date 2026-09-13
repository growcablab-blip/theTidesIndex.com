/**
 * The Tides Index — database schema.
 *
 * The canonical provenance path the schema exists to protect:
 *
 *   source -> source_location -> claim_evidence -> claim -> publication
 *   source -> source_location -> protocol_sources -> protocol
 *
 * Nothing reaches the public without resolving along one of those paths, and
 * the publish-gate triggers in the hand-written migration enforce it in the
 * database rather than only in application code.
 */
export * from './enums';
export * from './taxonomy';
export * from './identity';
export * from './sources';
export * from './peptides';
export * from './quality';
export * from './claims';
export * from './evidence-gaps';
export * from './quality-map';
export * from './certificates';
export * from './protocols';
export * from './evidence-context';
export * from './formulations';
export * from './identity-claims';
export * from './publications';
export * from './governance';
export * from './search';
