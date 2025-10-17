# Targets & Weights

## Default Targets

Stored per team per period. System-wide defaults apply if no team-specific config exists.

**Monthly Targets** (percentages):
- CC: 80%
- SC: 15%
- UP: 25%
- Fixed: 60%
- Referral Achievement: 80%
- Conversion: 30%

## Weekly Pacing

Targets scale by week:
- Week 1: target ÷ 4 (25%)
- Week 2: target ÷ 3 (33.3%)
- Week 3: target ÷ 2 (50%)
- Week 4: target ÷ 1 (100%)

## Status Thresholds

- **Above**: actual ≥ 100% of target
- **Warning**: actual ≥ 90% and < 100%
- **Below**: actual < 90%

Thresholds are configurable per team.

## Weights

Four weights (CC, SC, UP, Fixed) must sum to 100%. Default: 25% each.

**Weighted Score**:
```
score = Σ( clamp(actual/target, 0, 1.5) × weight/100 )
```

- Max contribution per metric: 1.5× (150% of target)
- Score range: 0–1.5 (typical above 1.0 = exceeding)

## Admin Configuration

Admins update targets/weights via `/api/targets`:
- Sliders with real-time validation
- Weight total must equal 100%
- Changes apply to future periods (historical data unaffected)

Leaders see read-only view in Targets Tracker page.

## Pacing Math Example

Monthly CC target = 80%
- Week 1 paced target = 80 ÷ 4 = 20%
- Week 2 paced target = 80 ÷ 3 = 26.7%
- Week 3 paced target = 80 ÷ 2 = 40%
- Week 4 paced target = 80 ÷ 1 = 80%

If agent has 70% CC in Week 3, status = 70/40 = 175% → **Above**.
