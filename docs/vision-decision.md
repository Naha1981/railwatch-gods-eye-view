# RailWatch — Vision AI: Decision Analysis

No decision has been made or implemented. This is research only.

## VERIFIED FACTS

**Licensing (checked 2026-09-20):**
- **Ultralytics YOLO** (YOLOv8/v11/etc.): dual-licensed — **AGPL-3.0** for the
  open-source path, or a paid **Enterprise License** for closed commercial
  use without AGPL's copyleft obligations. Ultralytics' own docs frame
  AGPL-3.0 as being for "students and hobbyists" and direct commercial users
  to the paid license. RailWatch is a commercial product — using the AGPL
  path as-is would carry real copyleft exposure if the model/weights are
  served as part of a network service; the Enterprise License is a real cost
  to weigh, not something to skip past.
- **Detectron2** (facebookresearch/detectron2): **Apache-2.0**, PyTorch-based,
  from FAIR. Supports object detection, instance/panoptic segmentation,
  keypoint detection. No commercial-license entanglement.
- **YOLOX** (Megvii-BaseDetection/YOLOX): **Apache-2.0**, anchor-free YOLO
  variant, exports to ONNX/TensorRT/ncnn/OpenVINO natively.
- **ONNX Runtime** (microsoft/onnxruntime): **MIT**, cross-platform inference
  engine. CPU inference is the default `onnxruntime` package (no GPU
  required); `onnxruntime-gpu` is a separate optional package.
- **OpenMMLab** (mmdetection etc.): not independently re-verified this pass
  beyond general knowledge that it is Apache-2.0-family; treat as
  **UNVERIFIED until checked directly** before depending on it.

**Fit for purpose:**
- General object detection ≠ railway defect detection. Off-the-shelf
  YOLO/Detectron2/YOLOX weights are trained on COCO-style everyday-object
  datasets (people, vehicles, animals, household items). None of them ship a
  "cracked rail" or "loose fastener" class out of the box.
- What a COCO-class pretrained model **can** realistically do at launch:
  detect people/vehicles/animals near the corridor (trespass, encroachment,
  obstruction), detect PPE-adjacent objects if a suitable open dataset
  exists, and flag generic anomalies for a human to review.
- What it **cannot** do without custom training: identify rail-specific
  defects (fishplate cracks, ballast degradation, fastener loss, rail surface
  defects) — this requires a labeled railway-defect dataset, which was not
  identified or verified in this pass (would need its own research/licensing
  check before assuming one exists usably).

## ASSUMPTIONS

- RailWatch's inference volume at launch is low enough for CPU inference to
  be acceptable latency-wise (seconds, not real-time video at 30fps).
- No GPU is available in the primary deployment target (see
  `compute-architecture.md` — Render has no GPU instance type).
- "Free to start" matters more than raw accuracy right now.

## RECOMMENDATION

**Apache-2.0 detector (YOLOX or Detectron2) exported to ONNX, served via
ONNX Runtime (CPU), behind `src/integrations/visionAdapter.js` and a new
FastAPI inference endpoint.** Do not use Ultralytics YOLO's AGPL path for a
commercial product without buying the Enterprise License; either pay for
that license or use a permissively-licensed alternative instead.

Ship it labeled `evidence_state: "DERIVED"` per your instruction — a
detection is not proof of a defect, it's a lead for a human to verify.
Confidence score is metadata, never a verdict.

## WHY

- Apache-2.0 avoids the AGPL commercial question entirely — no legal review
  needed before shipping.
- ONNX Runtime (MIT) as the inference layer means the actual detector
  (YOLOX today, something else tomorrow) is swappable without changing how
  RailWatch calls it — matches the adapter pattern already in
  `src/integrations/`.
- CPU-only is proven feasible for both training-free inference (small
  YOLOX variants run acceptably on CPU for non-video-realtime workloads) and
  matches Render's actual compute (no GPU instance type exists — verified in
  `compute-architecture.md`).
- Keeps the "swap models later" requirement structurally true: the adapter
  talks to an inference endpoint, not to a specific model file.

## TRADE-OFFS

- Apache-2.0 general detectors will **not** find rail-specific defects on
  day one — only people/vehicle/generic-object presence near the corridor.
  Setting that expectation now avoids overselling capability later.
  Building an actual defect detector needs a labeled dataset and training
  pipeline — real effort, not a weekend integration.
- Ultralytics YOLO is, by reputation and ecosystem size, easier to fine-tune
  and has more tutorials — but that convenience carries the AGPL-vs-paid
  decision. If NahaLabs later decides the Enterprise License is worth it,
  this recommendation should be revisited; it's a cost/legal call, not a
  technical one.
- Detectron2's GitHub activity should be checked again at implementation
  time — FAIR's public maintenance cadence on it has been reported as slower
  in recent years by third parties; this was not independently verified
  this pass and should be rechecked before committing to it over YOLOX.

## IMPLEMENTATION PLAN (when this phase is greenlit — not now)

1. Confirm which Apache-2.0 detector to start from (YOLOX vs Detectron2) —
   needs a quick side-by-side check of current maintenance activity at
   implementation time, not assumed from this pass.
2. Export chosen model to ONNX.
3. Build `railwatch/backend/vision_analysis.py`: loads the ONNX model via
   `onnxruntime`, exposes an internal inference function.
4. Add `POST /api/v1/evidence/vision-analysis` — accepts an image reference,
   returns the structured result shape below, `evidence_state: "DERIVED"`.
5. Wire `src/integrations/visionAdapter.js` to that endpoint.
6. Do not train a custom railway-defect model in this phase — that's a
   separate, larger effort requiring a dataset decision first.

**Structured result shape** (per your instruction):
```json
{
  "asset": "string",
  "image_url": "string",
  "timestamp": "ISO 8601",
  "gps": {"lat": 0, "lon": 0},
  "detections": [
    {
      "detected_object": "string",
      "class": "string",
      "confidence": 0.0,
      "bounding_box": [0, 0, 0, 0],
      "segmentation": null
    }
  ],
  "model": "string",
  "model_version": "string",
  "inference_timestamp": "ISO 8601",
  "evidence_state": "DERIVED"
}
```

## WHAT NOT TO BUILD YET

- No custom railway-defect training pipeline (needs a dataset decision first)
- No GPU inference path (not available on Render; revisit only if an
  external GPU worker is provisioned for another reason)
- No video real-time inference (frame-by-frame async is the realistic
  starting point)
- No vendor API integration (visualgpt.io rejected; no other vendor
  evaluated — this pass stayed open-source per your priority list)
