# Backend lint debt at the start of P1 (`ruff check app --statistics`, ruff 0.16.10)

Measured before the baseline was applied. 4428 findings in 94 files; 1846 are auto-fixable.
Regenerate with: `cd backend && python -m ruff check app --isolated --config pyproject.toml --statistics`
(or temporarily blank `ruff-baseline.toml`). This file is a snapshot, not a gate; the gate is
`ruff-baseline.toml` plus `scripts/quality_ratchet.py`.

```
1438  E501     line-too-long
1165  UP045    non-pep604-annotation-optional      [*]
 339  UP006    non-pep585-annotation               [*]
 203  BLE001   blind-except
 128  B008     function-call-in-default-argument
 120  S608     hardcoded-sql-expression
 105  UP035    deprecated-import
 102  I001     unsorted-imports                    [*]
  98  S110     try-except-pass
  88  UP017    datetime-timezone-utc               [*]
  86  F401     unused-import
  79  PLR2004  magic-value-comparison
  55  C901     complex-structure
  39  PLR0912  too-many-branches
  39  PLR0915  too-many-statements
  28  UP007    non-pep604-annotation-union         [*]
  26  DTZ005   call-datetime-now-without-tzinfo
  25  TRY400   error-instead-of-exception
  22  PLR0913  too-many-arguments
  22  PLR0917  too-many-positional-arguments
  20  E402     module-import-not-at-top-of-file
  19  SIM105   suppressible-exception
  18  TRY003   raise-vanilla-args
  18  TRY300   try-consider-else
  16  F541     f-string-missing-placeholders       [*]
  15  E701     multiple-statements-on-one-line-colon
  11  B904     raise-without-from-inside-except
  11  PLR1714  repeated-equality-comparison
  11  PLR0911  too-many-return-statements
  10  RET505   superfluous-else-return             [*]
   9  ASYNC230 blocking-open-call-in-async-function
   9  ASYNC240 blocking-path-method-in-async-function
   8  E741     ambiguous-variable-name
   8  F841     unused-variable
   6  DTZ007   call-datetime-strptime-without-zone
   5  SIM114   if-with-same-arms                   [*]
   5  S112     try-except-continue
   4  TRY301   raise-within-try
   3  S104     hardcoded-bind-all-interfaces
   3  RET504   unnecessary-assign
   2  DTZ011   call-date-today
   2  PLR5501  collapsible-else-if                 [*]
   2  SIM102   collapsible-if
   2  S105     hardcoded-password-string
   1  SIM108   if-else-block-instead-of-if-exp
   1  SIM103   needless-bool
   1  F811     redefined-while-unused
   1  RET507   superfluous-else-continue           [*]
```

## Notable real bugs surfaced

- `F821` in `app/api/admin/pipeline.py`: `json` was used but never imported (the `NameError` was
  swallowed by `except Exception`). Fixed in P1.
- `F811` in `app/api/admin/system.py`: `Response` imported twice.
- `F841` in `app/services/email_service.py`: four sanitised variables computed but never used
  (check whether the email template is unsanitised).
- `S608` (120): hand-built SQL strings; each needs review in P3 (they are mostly f-strings with
  whitelisted fragments, but this is the main injection-risk surface).
