# Daily challenges and replay links

Phase 6 adds deterministic daily challenges and read-only replay sharing
to the Enhanced experience. It does not change the frozen Classic
behavior or visual baseline, and it does not turn Football Life Reborn
into a competitive service.

## Daily challenge identity

The challenge date is derived from the `Asia/Shanghai` calendar, not from
the browser's local time zone. Challenge version `1` derives these stable
values for each family:

```text
id   = daily-v1-<date>-<family>
seed = daily:v1:<date>:<family>
```

A given date, family, and challenge version therefore always produce the
same challenge identity and simulation seed.

Ordinary careers remain available through the explicit normal-career
action. They have no challenge context, progress panel, or replay result
card.

## Version 1 challenge rules

### One club

- Start by accepting an academy invitation.
- Permanently represent no more than one club. Loans do not count as a
  permanent transfer.
- Complete at least 16 seasons and retire.

### Asian glory

- Start with an AFC nationality whose international reputation is at
  most 2.
- Receive at least one senior national-team call-up.
- Reach a continental semifinal, final, or championship, or qualify for
  the World Cup.

### Goalkeeper legend

- Start in the goalkeeper position.
- Record at least 150 combined club and national-team clean sheets.
- Win a Golden Glove or an accepted continental, Club World Cup,
  national continental, or World Cup trophy.

Each rule is reported as pending, met, or failed. A challenge is active
while no rule has failed and at least one rule is pending, completed when
every rule is met, and failed as soon as any rule is failed. The result
screen explains the actual measurements behind each outcome.

## Replay wire contract

A replay is stored only in the URL fragment after `#r=`. Codec version
`1` serializes these logical fields:

- challenge ID;
- Classic content version;
- deterministic challenge seed;
- pacing mode;
- player identity;
- compact ordered choice log, including a forced outcome when present;
- final deterministic state fingerprint.

The compact wire document uses short field names and Base64 URL encoding.
It accepts at most 32 choices. Both the encoded fragment and the complete
generated URL must be no longer than 1,800 characters.

The final career state is not serialized. Opening a valid link rebuilds
the entire path through the same domain reducer, checks that every choice
was available at that exact decision, requires a completed retirement
summary, and compares the rebuilt state fingerprint with the shared
fingerprint. The replay screen is read-only and is resolved before any
career storage is accessed.

The checksum and state fingerprint detect corruption or modification.
They are not encryption, a signature, an identity proof, or an anti-cheat
mechanism.

## Compatibility and recovery

Replay codec and Classic content versions are independent compatibility
boundaries:

- An unknown codec version is rejected with an explicit unsupported
  version message.
- An unknown Classic content version is rejected instead of being
  approximated with current content.
- A challenge ID that does not match its versioned seed is rejected.
- Invalid encoding, schema, checksum, choice path, or final state
  fingerprint produces a dedicated recovery screen.
- A non-replay fragment continues through the normal application route.

There is no silent fallback to a new career and no migration that rewrites
the shared path. Recovery means opening the compatible application version
or asking the sender to copy a fresh, complete link.

Any future change that alters challenge derivation or rule semantics must
increment the challenge version. Any incompatible wire change must
increment the replay codec version. A Classic simulation or catalog change
must follow the separate content-version policy in
[`classic-versioning.md`](classic-versioning.md).

## Privacy and product boundary

Browser URL fragments are not included in normal HTTP requests to the
site host. Replay opening requires only the same static application assets
as an ordinary visit, and the application does not send replay data to an
API. The link can be opened with local storage unavailable.

The payload is transparent, decodable data rather than a secret. Anyone
who receives the complete URL can inspect or forward the player identity,
seed, choices, and result fingerprint. Users should treat a replay URL as
shareable career data.

Challenges are personal, deterministic goals. There are no accounts,
leaderboards, multiplayer comparison, server validation, prizes, ranking,
live data, or anti-cheat guarantees. Result cards and replay links describe
one reconstructed local simulation only.

Ordinary summary-card export and root-page QR behavior remain unchanged.
A challenge result card adds the challenge title, Shanghai date, outcome,
rule details, and a QR code for the replay URL.
