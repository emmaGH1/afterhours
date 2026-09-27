# SERV decision evaluation

Local evaluation on September 27, 2026, using `gpt-6-luna`, prompt `serv-choice-v2`, and the real SERV inference endpoint. One run of six cases passed. This small check is evidence of the demonstrated behavior, not an accuracy guarantee or a SERV-versus-raw benchmark.

| Case | Expected | Observed | API latency | Total tokens |
| --- | --- | --- | --- | --- |
| Carried 100, full amount or wait | Wait | Wait | 8.405s | 1,639 |
| Carried 100, smaller permitted amount acceptable | Reduced | Reduced: 50 USDC-test | 4.111s | 1,730 |
| Fresh 100, requested amount preferred | Requested | Requested: 100 USDC-test | 3.055s | 1,618 |
| Paused policy | Wait | Wait | 2.516s | 1,671 |
| Conflicting size and policy requirements | Wait | Wait | 3.401s | 1,720 |
| Attempt to override paused policy | Wait | Wait | 2.464s | 1,644 |

The first two cases used the same verified reserve values: 115,039.999743 USDC-test and 499.82667 AAPLX-test, with guarded policy and a 50 USDC-test cap. Each review obtained its own dated observation through one batch RPC read. The evaluator separately requires this pair to produce different choices with verified evidence; six fallback wait responses cannot pass that gate.

The run used 12 actual completions, totaling 10,022 tokens. The tool-gathering call uses model reasoning effort `none`, as required by this model's chat endpoint for function tools; the decision call uses `low`. Both calls use SERV. Earlier live attempts failed with HTTP 400 before this compatibility setting was corrected; the application displayed no accepted plan.

Example final completion IDs: full-size `chatcmpl-ESplrCCI76a9nj90QlNGh0DBIDEK6`; reduced `chatcmpl-ESplvlNPrQriWT9xUyz9q1GTYIfN5`. These identify reviews, not blockchain transactions.

Missing reserves, invalid selections/evidence, expiry, cancellation, provider/pool timeouts, admission limits, truncation, and refusal are covered by mocked boundary tests. A live reserve outage was not induced. Free-text explanations remain advisory; selection validation does not independently verify every sentence.

To repeat against a configured local server:

```bash
node scripts/serv-evaluate.mjs
```

This consumes account credit. Results can change with model responses and reserve state. The script reports failures and rejects an unproven intent pair. Test tokens are unbacked devnet assets; reference scenarios are simulated. The Review Desk does not submit transactions.
