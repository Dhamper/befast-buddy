# BEFAST AI — Conclusion

## 1. Conclusion

The integration of the individual BEFAST components allows the system to perform
a more comprehensive preliminary assessment than relying on a single symptom.
Information obtained from Balance, Eyes, Face, Arms and Speech, together with
symptom onset time, is combined to produce an overall screening result. The
combination rule is deliberately conservative: a single sign judged present, or
merely uncertain, is sufficient to escalate the whole assessment and open the
emergency pathway, so the system is biased toward false alarms rather than
missed detections.

The prototype demonstrates the feasibility of integrating multiple forms of
data — video frames, still images, audio and reported symptom information — into
a single AI-assisted BEFAST screening application. The assistance is twofold:
pretrained machine-learning models supply the low-level measurements, in the
form of facial and postural landmarks and a speech transcript, while an explicit
rule layer converts those measurements into a per-sign judgement. This
multimodal approach may be useful because stroke can present with different
combinations of symptoms among individuals, and because a sign that one modality
cannot capture may still be reported through the observer questionnaire, which
overrides the automated result when the two disagree.

Overall, the project demonstrates the feasibility of combining the BEFAST
principle with artificial intelligence to create an accessible preliminary
stroke-screening application that runs entirely in a web browser without an
application server. Further development should focus on assembling a labelled
dataset, validating the system against clinically appropriate reference data,
calibrating the decision thresholds to improve sensitivity and specificity, and
evaluating the application under realistic conditions. With appropriate clinical
validation, the BEFAST AI concept may contribute to faster recognition of
suspected stroke and encourage timely access to emergency medical care.

## 2. Present validation status

No accuracy has yet been established, and none is claimed. The fifteen decision
thresholds were selected by inspection and are declared unvalidated in the
source; there is no labelled dataset, no clinical reference standard and no
automated test suite. The application therefore reports categorical urgency
tiers rather than a probability, and labels every displayed figure a prototype
estimate. The thresholds are also not the complete decision surface: feature
weights, the ten-second hold, the 2.2-second target exposure and the
eight-second recording window are undocumented constants inside the modules.

## 3. Recommended evaluation methodology

**Reference standard.** Ground truth should be the discharge diagnosis
established by neuroimaging and neurologist assessment; a lower-cost initial
study may substitute concurrent NIHSS or FAST-ED scoring by a certified
examiner. Because each sign is judged separately, labels are required per sign
and not only per participant.

**Study design.** A prospective paired-comparison study, with the application
and the reference standard blinded to each other. Recruitment should include
stroke mimics such as Bell's palsy, migraine, seizure and hypoglycaemia
alongside healthy controls, since specificity estimated from a stroke-only
cohort is uninformative.

**Primary metrics.** Sensitivity, specificity, PPV and NPV with 95% confidence
intervals, reported per sign and for the screen as a whole. For an application
whose output is a recommendation to call emergency services, sensitivity is the
quantity to prioritise, as a missed detection is the more harmful error.

**Threshold calibration.** The continuous features should be swept across ROC
curves, with AUC reported and operating points fixed at a pre-specified minimum
sensitivity rather than chosen by inspection. Three output tiers imply two
thresholds per sign, so an explicit misclassification-cost criterion is needed.

**Reliability.** Cohen's kappa against clinician judgement and between observers
completing the questionnaire; Bland-Altman comparison of the continuous measures
against manual annotation; test-retest repeatability; and inter-device variance
across handsets, lighting and camera distance, since landmark quality depends on
all three. Subgroup analysis by skin tone, age, eyewear, facial hair, seated
posture and language is also required.

## 4. Measurement issues

Review of the feature extraction found four issues that would bias a
validation study before recruitment, all since fixed: arm drift's divisor was
recomputed every frame instead of fixed at the start, and its comparison was
signed so upward drift never registered; postural sway's divisor had the same
recomputation flaw, and a whole-hold standard deviation diluted a single large
lurch; the eyelid/gaze figure was whichever frame happened to be last, so a
blink could decide it; transcript accuracy was order-insensitive, so a
scrambled utterance scored full marks. One issue remains open: each
measurement is stored as a display string with the number discarded, blocking
later recalibration from real app usage.

## 5. Preliminary proxy-dataset evaluation

Lacking clinical data, two signs were checked against public proxies instead
(methodology and caveats: `scripts/eval-data/README.md`). Speech vs. TORGO
dysarthric speech (n=562): AUC 0.608. Face vs. PalsyNet Bell's-palsy video
(n=49, all of it): AUC 0.468, chance level. Neither meets screening-grade
accuracy (~0.8+) or substitutes for section 3's study.

## 6. Limitations

A single camera yields two-dimensional landmarks that only approximate
three-dimensional motion, degrading with poor lighting, oblique angles and
distance. Camera frames are never transmitted, but speech transcription is
performed by a browser service that sends audio to the vendor, and the ML
runtime and weights are fetched from public CDNs on first use, requiring
network access. Speech recognition is unavailable in Firefox and inconsistent
on iOS Safari, falling back to the questionnaire; the target phrase is
English at en-US and would score healthy Thai speakers as impaired. BEFAST
misses some posterior-circulation presentations. The application is a
screening aid, not a diagnostic device.
