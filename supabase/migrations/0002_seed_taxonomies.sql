-- The Tides Index foundation seed values.
-- Claude Code may replace this with a programmatic seeder if preferred.

insert into routes (route_key, name) values
  ('subcutaneous','Subcutaneous'),
  ('intramuscular','Intramuscular'),
  ('intravenous','Intravenous'),
  ('intranasal','Intranasal'),
  ('oral','Oral'),
  ('sublingual-buccal','Sublingual / Buccal'),
  ('topical','Topical'),
  ('intradermal','Intradermal'),
  ('intra-articular','Intra-articular'),
  ('other','Other / Specialized')
on conflict (route_key) do nothing;

insert into quality_topics (quality_key, name, slug) values
  ('peptide-synthesis-spps','Peptide synthesis / SPPS','peptide-synthesis-spps'),
  ('purification','Purification','purification'),
  ('identity-testing','Identity testing','identity-testing'),
  ('hplc-purity','HPLC / chromatographic purity','hplc-purity'),
  ('mass-spectrometry','Mass spectrometry','mass-spectrometry'),
  ('peptide-content-assay','Peptide content / assay','peptide-content-assay'),
  ('sterility','Sterility','sterility'),
  ('bacterial-endotoxin','Bacterial endotoxin','bacterial-endotoxin'),
  ('gmp-cgmp','GMP / cGMP','gmp-cgmp'),
  ('lyophilization','Lyophilization','lyophilization'),
  ('formulation-excipients','Formulation / excipients','formulation-excipients'),
  ('administration-delivery','Administration / delivery','administration-delivery'),
  ('storage-stability','Storage / stability','storage-stability'),
  ('transport-excursions','Transportation / excursions','transport-excursions'),
  ('batch-traceability','Lot / batch traceability','batch-traceability'),
  ('global-manufacturing','Global manufacturing / supplier qualification','global-manufacturing')
on conflict (quality_key) do nothing;
