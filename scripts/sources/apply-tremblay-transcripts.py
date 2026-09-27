"""Merges the Tremblay transcript material into the compound packets.

    python scripts/sources/apply-tremblay-transcripts.py

Content lives in `data/seed/evidence/tremblay-transcript-additions.json`; this
script only merges it. Idempotent: every entry is keyed, and re-running replaces
rather than appends, so the extraction can be corrected and re-applied.

WHAT IT DOES NOT DO

It reads no transcript and infers nothing. Every claim, route, protocol and gap
in the data file was written by reading the held transcript, and each carries
the speaker turn it came from. The script exists so the edit is reproducible and
reviewable in one place, not so that anything is generated.

THE LOCATOR CONVENTION

These transcripts have no timestamps. A locator is therefore the speaker turn
plus a distinctive phrase from it, recorded in `section`. A reader can open the
publisher's page and search for the phrase, and
`scripts/sources/verify-transcript-locators.ts` checks every one against the
held snapshot.
"""

import glob
import io
import json
import os

PACKETS = 'data/seed/evidence'
# Deliberately NOT in the packet directory: that directory is globbed as "every
# evidence packet" by the seed loader and by tests, and a file sitting in it
# that is not a packet breaks them. Split across numbered files only because
# each is written by hand and a short file is a readable one.
ADDITIONS = sorted(glob.glob('data/seed/tremblay/tremblay-transcript-additions*.json'))

# Which key identifies a row, per packet field.
KEY_FIELD = {
    'locations': 'key',
    'claims': 'claimKey',
    'routes': 'routeKey',
    'protocols': 'protocolKey',
    'notYetSupported': 'statement',
    'disagreements': 'disagreementKey',
}


def merge(packet, field, rows):
    """Replaces rows with matching keys, appends the rest, preserving order."""
    key_field = KEY_FIELD[field]
    existing = packet.setdefault(field, [])
    by_key = {row[key_field]: index for index, row in enumerate(existing)}
    added = 0
    for row in rows:
        if row[key_field] in by_key:
            existing[by_key[row[key_field]]] = row
        else:
            existing.append(row)
            added += 1
    return added


def main():
    additions = {}
    for path in ADDITIONS:
        with io.open(path, encoding='utf-8') as handle:
            for packet_key, fields in json.load(handle).items():
                for field, rows in fields.items():
                    additions.setdefault(packet_key, {}).setdefault(field, []).extend(rows)

    for packet_key, fields in additions.items():
        path = os.path.join(PACKETS, packet_key + '.json')
        with io.open(path, encoding='utf-8') as handle:
            packet = json.load(handle)

        counts = []
        for field, rows in fields.items():
            added = merge(packet, field, rows)
            counts.append('%s +%d' % (field, added))

        with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
            handle.write(json.dumps(packet, indent=2, ensure_ascii=False) + '\n')
        print('%-20s %s' % (packet_key, ', '.join(counts)))


if __name__ == '__main__':
    main()
