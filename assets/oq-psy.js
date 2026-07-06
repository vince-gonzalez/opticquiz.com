// ============================================================
// OQ-PSY  v1.0.0 — OpticQuiz shared psychophysics engine
// opticquiz.com
// ============================================================
//
// The reusable core behind every threshold test on OpticQuiz.
// One honest adaptive-staircase controller + threshold estimator,
// shared so contrast / vernier / saturation / hue don't each
// reimplement (and drift on) the same psychometrics.
//
// PARADIGM: transformed up/down staircase (default 1-up / 2-down,
// which converges on the ~71% correct point). "Harder" always means
// the stimulus value moves toward `min` by multiplying by `factor`
// (a geometric step, factor < 1). A wrong answer eases it by dividing
// by `factor`, bounded by `max`. Threshold = mean of the last N
// reversals (the standard estimator), falling back to fewer reversals
// or the final value when a run is too short.
//
// USAGE:
//   var s = OQ.Staircase({ value: 0.55, min: 0.006, max: 0.55, factor: 0.8 });
//   ... each trial:
//   s.record(wasCorrect);      // updates s.value
//   drawAt(s.value);
//   ... at the end:
//   var t = s.threshold();     // mean of last 4 reversals
//
// NO DEPENDENCIES. var-only. Attaches to window.OQ.
// ============================================================

var OQ = window.OQ || {};

(function () {

  function mean(arr) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return arr.length ? s / arr.length : 0;
  }

  // Staircase controller.
  // cfg: { value, min, max, factor, down?, up? }
  //   value  — starting (easy) stimulus level
  //   min    — hardest allowed level (floor)
  //   max    — easiest allowed level (ceiling)
  //   factor — geometric step toward harder (0 < factor < 1)
  //   down   — correct answers in a row before getting harder (default 2)
  //   up     — wrong answers before getting easier (default 1)
  function Staircase(cfg) {
    if (!(this instanceof Staircase)) return new Staircase(cfg);
    this.value = cfg.value;
    this.min = cfg.min;
    this.max = cfg.max;
    this.factor = cfg.factor;
    this.down = cfg.down || 2;
    this.up = cfg.up || 1;
    // internal
    this.consecCorrect = 0;
    this.consecWrong = 0;
    this.prevDir = null;      // 'harder' | 'easier' — for reversal detection
    this.reversals = [];
    this.history = [];        // {value, correct} per trial
  }

  // Record one trial's outcome; returns the new stimulus value.
  Staircase.prototype.record = function (correct) {
    this.history.push({ value: this.value, correct: !!correct });
    if (correct) {
      this.consecCorrect++;
      this.consecWrong = 0;
      if (this.consecCorrect >= this.down) {
        if (this.prevDir === 'easier') this.reversals.push(this.value);
        this.value = Math.max(this.min, this.value * this.factor);
        this.consecCorrect = 0;
        this.prevDir = 'harder';
      }
    } else {
      this.consecWrong++;
      this.consecCorrect = 0;
      if (this.consecWrong >= this.up) {
        if (this.prevDir === 'harder') this.reversals.push(this.value);
        this.value = Math.min(this.max, this.value / this.factor);
        this.consecWrong = 0;
        this.prevDir = 'easier';
      }
    }
    return this.value;
  };

  // Threshold estimate = mean of the last `useLastN` reversals.
  // Falls back to all reversals, then to the current value.
  Staircase.prototype.threshold = function (useLastN) {
    var n = useLastN || 4;
    var r = this.reversals;
    if (r.length >= n) return mean(r.slice(-n));
    if (r.length > 0) return mean(r);
    return this.value;
  };

  Staircase.prototype.reversalCount = function () { return this.reversals.length; };

  OQ.Staircase = Staircase;
  OQ.mean = mean;
  OQ.VERSION = '1.0.0';

})();

window.OQ = OQ;
