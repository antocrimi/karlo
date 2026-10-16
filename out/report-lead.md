# Karl back-test by lead time (total cloud cover)

Total cloud cover from the forecast issued 0 to 3 days ahead, against airport METARs, 2026-06-01 to 2026-10-10. Proxy for Karl's own variables, which the API does not carry at lead.

## San Francisco Intl (KSFO)

Truth: any broken or overcast layer.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3166 | 1274 | 78% | 84% | 31% |
| 0 day, 06:00 to 18:00 | 1714 | 690 | 76% | 85% | 34% |
| 1 day, cover >= 45 | 3166 | 1274 | 77% | 69% | 27% |
| 1 day, 06:00 to 18:00 | 1714 | 690 | 79% | 70% | 24% |
| 2 day, cover >= 45 | 3166 | 1274 | 72% | 50% | 27% |
| 2 day, 06:00 to 18:00 | 1714 | 690 | 74% | 50% | 22% |
| 3 day, cover >= 45 | 3166 | 1274 | 69% | 46% | 33% |
| 3 day, 06:00 to 18:00 | 1714 | 690 | 70% | 46% | 30% |

Truth: broken or overcast at or below 2500 ft.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3166 | 764 | 74% | 98% | 52% |
| 1 day, cover >= 45 | 3166 | 764 | 68% | 62% | 61% |
| 2 day, cover >= 45 | 3166 | 764 | 66% | 36% | 68% |
| 3 day, cover >= 45 | 3166 | 764 | 64% | 34% | 71% |

## Oakland Intl (KOAK)

Truth: any broken or overcast layer.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3166 | 1455 | 81% | 87% | 25% |
| 0 day, 06:00 to 18:00 | 1714 | 800 | 83% | 87% | 20% |
| 1 day, cover >= 45 | 3166 | 1455 | 79% | 78% | 24% |
| 1 day, 06:00 to 18:00 | 1714 | 800 | 79% | 74% | 21% |
| 2 day, cover >= 45 | 3166 | 1455 | 71% | 54% | 24% |
| 2 day, 06:00 to 18:00 | 1714 | 800 | 72% | 51% | 18% |
| 3 day, cover >= 45 | 3166 | 1455 | 70% | 52% | 25% |
| 3 day, 06:00 to 18:00 | 1714 | 800 | 70% | 48% | 21% |

Truth: broken or overcast at or below 2500 ft.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3166 | 952 | 77% | 100% | 44% |
| 1 day, cover >= 45 | 3166 | 952 | 69% | 77% | 51% |
| 2 day, cover >= 45 | 3166 | 952 | 65% | 46% | 57% |
| 3 day, cover >= 45 | 3166 | 952 | 65% | 45% | 58% |

## Half Moon Bay (KHAF)

Truth: any broken or overcast layer.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3118 | 2169 | 82% | 100% | 21% |
| 0 day, 06:00 to 18:00 | 1689 | 1049 | 76% | 100% | 28% |
| 1 day, cover >= 45 | 3118 | 2169 | 76% | 91% | 22% |
| 1 day, 06:00 to 18:00 | 1689 | 1049 | 72% | 91% | 29% |
| 2 day, cover >= 45 | 3118 | 2169 | 61% | 57% | 19% |
| 2 day, 06:00 to 18:00 | 1689 | 1049 | 54% | 43% | 29% |
| 3 day, cover >= 45 | 3118 | 2169 | 59% | 56% | 21% |
| 3 day, 06:00 to 18:00 | 1689 | 1049 | 54% | 44% | 30% |

Truth: broken or overcast at or below 2500 ft.

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 3154 | 2088 | 79% | 100% | 24% |
| 1 day, cover >= 45 | 3154 | 2088 | 74% | 91% | 25% |
| 2 day, cover >= 45 | 3154 | 2088 | 60% | 57% | 23% |
| 3 day, cover >= 45 | 3154 | 2088 | 58% | 56% | 25% |

## All stations, any broken layer

| lead | hours | METAR yes | right | caught | false alarm |
|---|---|---|---|---|---|
| 0 day, cover >= 45 | 9450 | 4898 | 80% | 92% | 25% |
| 1 day, cover >= 45 | 9450 | 4898 | 77% | 81% | 23% |
| 2 day, cover >= 45 | 9450 | 4898 | 68% | 54% | 23% |
| 3 day, cover >= 45 | 9450 | 4898 | 66% | 52% | 25% |