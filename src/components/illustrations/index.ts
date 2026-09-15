/**
 * The illustration system: one registry, so pages ask for a drawing by what it
 * explains rather than importing a component and choosing an id.
 */
import {
  CellSignallingIllustration,
  ChainScaleIllustration,
  CirculationIllustration,
  ConcentrationTimeIllustration,
  MessageReceiverIllustration,
  PeptideBondIllustration,
  PeptideLifecycleIllustration,
  ReceptorBindingIllustration,
  RoutesIllustration,
} from './biology';
import {
  EditorialStatesIllustration,
  EvidenceLanesIllustration,
  KnownUnknownIllustration,
  ProtocolComparisonIllustration,
  StudyDesignIllustration,
} from './method';
import {
  ChainOfCustodyIllustration,
  ChromatogramIllustration,
  EndotoxinIllustration,
  FormulationIllustration,
  LyophilisationIllustration,
  MassIdentityIllustration,
  QualitySpineIllustration,
  SeparateQuestionsIllustration,
  SequenceToVialJourneyIllustration,
  SterilityIllustration,
} from './quality';

export * from './frame';
export type { SpineStageKey } from './quality';
export { QUALITY_SPINE_STAGES } from './quality';
export {
  CellSignallingIllustration,
  ChainOfCustodyIllustration,
  ChromatogramIllustration,
  EditorialStatesIllustration,
  FormulationIllustration,
  QualitySpineIllustration,
  SeparateQuestionsIllustration,
  StudyDesignIllustration,
  ChainScaleIllustration,
  CirculationIllustration,
  ConcentrationTimeIllustration,
  EndotoxinIllustration,
  EvidenceLanesIllustration,
  KnownUnknownIllustration,
  LyophilisationIllustration,
  MassIdentityIllustration,
  MessageReceiverIllustration,
  PeptideBondIllustration,
  PeptideLifecycleIllustration,
  ProtocolComparisonIllustration,
  ReceptorBindingIllustration,
  RoutesIllustration,
  SequenceToVialJourneyIllustration,
  SterilityIllustration,
};

export const ILLUSTRATIONS = {
  'chain-scale': ChainScaleIllustration,
  'peptide-bond': PeptideBondIllustration,
  'message-receiver': MessageReceiverIllustration,
  'peptide-lifecycle': PeptideLifecycleIllustration,
  'receptor-binding': ReceptorBindingIllustration,
  'cell-signalling': CellSignallingIllustration,
  circulation: CirculationIllustration,
  routes: RoutesIllustration,
  'concentration-time': ConcentrationTimeIllustration,
  'sequence-to-vial': SequenceToVialJourneyIllustration,
  'mass-identity': MassIdentityIllustration,
  sterility: SterilityIllustration,
  endotoxin: EndotoxinIllustration,
  lyophilisation: LyophilisationIllustration,
  'chain-of-custody': ChainOfCustodyIllustration,
  'evidence-lanes': EvidenceLanesIllustration,
  'known-unknown': KnownUnknownIllustration,
  'protocol-comparison': ProtocolComparisonIllustration,
  'separate-questions': SeparateQuestionsIllustration,
  chromatogram: ChromatogramIllustration,
  'quality-spine': QualitySpineIllustration,
  formulation: FormulationIllustration,
  'editorial-states': EditorialStatesIllustration,
  'study-design': StudyDesignIllustration,
} as const;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;

/** The drawings that belong with each learning topic, in reading order. */
export const TOPIC_ILLUSTRATIONS: Readonly<Record<string, readonly IllustrationKey[]>> = {
  'what-is-a-peptide': ['chain-scale', 'peptide-bond'],
  'amino-acids-to-proteins': ['chain-scale'],
  'peptides-in-the-body': ['peptide-lifecycle', 'message-receiver'],
  'peptide-signalling': ['message-receiver', 'cell-signalling'],
  'receptor-pharmacology': ['receptor-binding'],
  'pharmacology-receptors': ['receptor-binding'],
  'pharmacokinetic-concepts': ['concentration-time', 'circulation'],
  'routes-of-administration': ['routes'],
  'peptides-as-medicines': ['routes'],
};

/** The drawings that belong with each quality topic page. */
export const QUALITY_ILLUSTRATIONS: Readonly<Record<string, readonly IllustrationKey[]>> = {
  'hplc-purity': ['chromatogram', 'separate-questions'],
  'identity-testing': ['mass-identity'],
  'formulation-excipients': ['formulation'],
  sterility: ['sterility'],
  'bacterial-endotoxin': ['endotoxin'],
  lyophilisation: ['lyophilisation'],
  lyophilization: ['lyophilisation'],
  'batch-traceability': ['chain-of-custody'],
  'transport-excursions': ['chain-of-custody'],
  'peptide-synthesis-spps': ['sequence-to-vial'],
  purification: ['sequence-to-vial'],
};
