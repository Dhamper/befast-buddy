# BEFAST AI — Conclusion

## 1. Summary of the work

BEFAST AI is a browser-based prototype that guides a user through the six
BE-FAST stroke warning signs. Balance, Eyes, Face and Arms are measured from
MediaPipe pose- and face-landmark streams; Speech is assessed by comparing a Web
Speech API transcript against a fixed target phrase; Time is not sensed but
recorded from an onset question and carried as a running clock into a responder
handoff summary. Scoring is rule-based rather than learned: fifteen thresholds
in a single module map continuous measures onto four per-sign states, and an
observer questionnaire serves as both fallback and override. The system is
biased toward false alarms — one uncertain sign opens the emergency route.

Camera analysis is genuinely local; frames are never transmitted. The claim of
wholly on-device processing shown in the interface is nevertheless inaccurate for
Speech, because the Web Speech API transcribes through a vendor cloud service in
every browser that implements it. Model weights and the WASM runtime are also
fetched from public CDNs on first use.

## 2. Accuracy has not been measured

The accuracy of this prototype is unknown and no claim is made about it. The
thresholds were chosen by inspection and the source declares them unvalidated;
there is no labelled dataset, no reference standard and no automated test suite.
The interface therefore reports categorical urgency tiers rather than a
probability, and tags every displayed figure a prototype estimate. Those fifteen
thresholds are also not the whole decision surface: feature weights, the
ten-second hold, the 2.2-second target exposure and the eight-second recording
window are undocumented constants inside the modules.

## 3. Construct validity must be established first

Review of the feature extraction found defects that would bias any clinical
study and should be corrected before recruitment. Arm drift is divided by an arm
length recomputed on the final frame, so as the arm falls the divisor shrinks and
the normalised drift inflates; only the first and last frames contribute, making
a drift that recovers within the hold invisible, and the comparison is signed, so
upward drift can never trip a threshold. Postural sway is a standard deviation
normalised by the last frame's shoulder width, diluting a single large lurch. The
eyelid and gaze figure is whatever the final animation frame produced, with no
accumulation, so an ordinary blink can determine the result. Transcript accuracy
is order-insensitive bag-of-words matching, so a scrambled utterance of the
correct words scores 1.0, and pauses are counted only when voice resumes, so
trailing silence is never counted. The scored facial asymmetry index omits the
mouth-frown term that the live on-screen meter includes.

## 4. How accuracy should be measured

**Reference standard.** Ground truth should be the discharge diagnosis
established by neuroimaging and neurologist assessment; a lower-cost first study
may substitute concurrent NIHSS or FAST-ED scoring by a certified examiner.
Labels are required per sign, not only per patient.

**Study design.** A prospective paired-comparison study in an emergency
department, with the application and the reference standard blinded to each
other. Recruitment must include stroke mimics — Bell's palsy, migraine, seizure,
hypoglycaemia — and healthy controls; specificity estimated from a stroke-only
cohort is meaningless.

**Primary metrics.** Sensitivity, specificity, PPV and NPV with 95% confidence
intervals, per sign and for the screen as a whole, from a 2x2 contingency table.
For an instrument whose output is "call emergency services", sensitivity is the
quantity to maximise: a false negative is the harmful error, whereas a false
positive costs one avoidable ambulance call.

**Threshold selection.** The continuous features should be swept across ROC
curves, with AUC reported and operating points fixed at a pre-specified minimum
sensitivity rather than by eye. Three output tiers imply two thresholds per sign,
so an explicit misclassification-cost criterion is required.

**Agreement and reliability.** Cohen's kappa against clinician judgement and
between observers answering the questionnaire; Bland-Altman analysis of the
continuous measures against manual annotation; test-retest repeatability; and
inter-device variance across handsets, lighting and camera distance, since
landmark quality depends on all three.

**Power and subgroups.** The cohort should be sized for a target confidence
interval on sensitivity, with subgroup analysis by skin tone, age, eyewear,
facial hair, seated posture and language.

## 5. Software prerequisites

Each measurement is formatted into a display string and the underlying number
discarded; at most twenty archived sessions are held in browser storage, and
there is no consented export path. Evaluation therefore requires numeric feature
logging, an export mechanism, an offline replay harness that re-runs the scoring
functions over recorded media so thresholds can be re-swept without
re-recruiting, and unit tests around the decision logic.

## 6. Limitations

A single camera yields 2D landmarks that only approximate 3D motion, degrading
with poor lighting, oblique angles and distance. No service worker is present,
so despite an installable manifest the application cannot run offline. Speech
recognition is absent in Firefox and inconsistent on iOS Safari, in which case
the sign falls back to the questionnaire. The target phrase is English with the
recogniser fixed to en-US, and would score healthy Thai speakers as impaired.
BE-FAST does not capture every posterior-circulation presentation. This is not a
diagnostic device.

## 7. Conclusion

The prototype demonstrates that a complete BE-FAST pathway — five sensed signs
plus onset timing, an auditable rule-based scorer and a fail-safe bias toward
escalation — can run in a browser with no application server. It remains an
engineering demonstration rather than a validated instrument: the defects in
Section 3 must be corrected and the study in Section 4 conducted before any
statement about its accuracy is possible.
