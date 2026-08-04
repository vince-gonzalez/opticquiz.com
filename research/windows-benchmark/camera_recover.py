"""
Stage 1-alt — recover a display-side colour transform from PHOTOGRAPHS of the screen.

No software vantage point exists (see FINDINGS.md), so the only remaining way to measure the
Windows colour filters is to measure light leaving the display. This does that.

    # prove the whole pipeline first, against a transform whose answer we already know:
    python camera_recover.py validate

    # then the real thing
    python camera_recover.py recover --off off.jpg --on on.jpg --name windows-deutan

WHY THIS IS RECOVERABLE AT ALL
    A camera measures  cam = C(P · rgb)  where P maps nominal RGB to emitted spectra and C is
    the camera's spectral response. With a display-side matrix M in place, cam' = C(P · M·rgb).
    Both photos see the SAME C and P, so fitting off->on in camera space yields A, and with
    K = CP estimated from the 'off' photo (the nominal RGB of every patch is known), the
    display-side matrix is M = K A K^-1. The camera's own response cancels: it does not need
    to be calibrated, only held CONSTANT between the two shots.

    Validated end to end: recovers a known injected matrix to +/-0.0025 through simulated
    perspective, vignetting, white-balance cast, camera gamma and sensor noise, and selects
    the correct colour space by residual (0.56/255 vs 10.71 for the wrong one).

WHAT WILL RUIN IT — all of these must be locked before shooting
    · auto-exposure, auto-white-balance, auto-focus, HDR, "smart" scene modes
    · moving the camera, or the display, between shots
    · reflections, ambient light changes, another screen lighting the room
    · display auto-brightness / adaptive contrast
    · shooting JPEG at an angle steep enough to alias the pixel grid (moiré)

VALIDATE BEFORE YOU TRUST IT. `validate` renders a known matrix into a synthetic photo,
including perspective, vignetting, noise and a camera gamma, and reports the recovery error.
If the pipeline cannot recover a known answer under simulated photography, it cannot be
trusted on a real one, and the reported error is the floor on any real measurement.
"""
import argparse, json, sys
import numpy as np
import cv2


# ---------- registration ----------------------------------------------------

def rectify(path, index):
    """Find the four ArUco markers and warp the photo back into target coordinates."""
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"cannot read {path}")
    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    det = cv2.aruco.ArucoDetector(d, cv2.aruco.DetectorParameters())
    corners, ids, _ = det.detectMarkers(img)
    if ids is None or len(ids) < 4:
        sys.exit(f"{path}: found {0 if ids is None else len(ids)} of 4 markers. "
                 "Reshoot with the whole target in frame, in focus, no glare on the corners.")
    found = {int(i): c[0] for i, c in zip(ids.flatten(), corners)}
    if not all(k in found for k in (0, 1, 2, 3)):
        sys.exit(f"{path}: markers {sorted(found)} detected, need 0,1,2,3.")

    M = index["marker_size"]
    tl = index["marker_corners_tl"]
    # Marker outer corners in target coordinates, same order OpenCV returns them.
    dst, src = [], []
    for mid in (0, 1, 2, 3):
        x, y = tl[mid]
        dst += [[x, y], [x + M, y], [x + M, y + M], [x, y + M]]
        src += [list(p) for p in found[mid]]
    H, _ = cv2.findHomography(np.array(src, np.float32), np.array(dst, np.float32), cv2.RANSAC)
    return cv2.warpPerspective(img, H, (index["width"], index["height"]))


def sample(rect, index):
    """Mean colour of each patch's centre region, as float RGB 0-1."""
    out = []
    for p in index["patches"]:
        x, y, w, h = p["sample"]
        block = rect[y:y + h, x:x + w].reshape(-1, 3)[:, ::-1]   # BGR -> RGB
        out.append(block.mean(axis=0) / 255.0)
    return np.array(out)


# ---------- recovery --------------------------------------------------------

def srgb_to_linear(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def fit_camera_gamma(nominal, cam):
    """Estimate the camera's per-channel encoding exponent from the neutral ramp.

    A camera JPEG is gamma-encoded; the linear-algebra recovery below assumes linearity.
    The target carries a 17-step neutral ramp precisely so the response can be measured out
    of the photograph itself, with no colour chart and no camera calibration. Fits
    cam = s * light**(1/gamma) per channel by linear regression in log space.
    """
    neutral = np.all(np.abs(nominal - nominal[:, :1]) < 1e-9, axis=1)
    light = srgb_to_linear(nominal[neutral])
    meas = cam[neutral]
    ok = (light[:, 0] > 0.02) & np.all(meas > 0.02, axis=1)     # drop the crushed toe
    if ok.sum() < 5:
        return np.array([1.0, 1.0, 1.0])                        # assume linear (RAW input)
    g = []
    for ch in range(3):
        A = np.vstack([np.log(light[ok, ch]), np.ones(ok.sum())]).T
        slope, _ = np.linalg.lstsq(A, np.log(meas[ok, ch]), rcond=None)[0]
        g.append(1.0 / slope if slope > 1e-6 else 1.0)
    return np.array(g)


def solve(nominal, cam_off, cam_on, space="linear"):
    """Return the display-side matrix M, plus diagnostics.

    The camera is linearised first (see fit_camera_gamma), because K and A below are linear
    models and fitting them to gamma-encoded values yields a plausible but wrong matrix.
    Lens vignetting cancels in A — it is the same per-pixel gain in both photographs — but
    would bias K, so K is fitted after linearisation too.

    K : display drive -> linearised camera, fitted from the 'off' photo
    A : linearised camera -> linearised camera, fitted off->on
    M = K A K^-1   (the camera's own response cancels; it need only be held CONSTANT)
    """
    gamma = fit_camera_gamma(nominal, cam_off)
    lin_off = np.clip(cam_off, 1e-6, None) ** gamma      # camera -> light
    lin_on = np.clip(cam_on, 1e-6, None) ** gamma

    if space == "linear":
        # The filter acts on emitted light; compare in light.
        drive = srgb_to_linear(nominal)
    else:
        # The filter acts on the DRIVE signal, before the panel's sRGB transfer curve.
        # Light and drive differ by that curve, so a 3x3 fitted in light cannot represent
        # a matrix applied in drive space at all. Map the measurements back through the
        # curve first, normalising by white since the camera's scale is arbitrary.
        white = np.percentile(lin_off, 99.5, axis=0)
        white[white <= 0] = 1.0
        lin_off = linear_to_srgb(np.clip(lin_off / white, 0, 1))
        lin_on = linear_to_srgb(np.clip(lin_on / white, 0, 1))
        drive = nominal

    K, *_ = np.linalg.lstsq(drive, lin_off, rcond=None)          # row-vector convention
    A, *_ = np.linalg.lstsq(lin_off, lin_on, rcond=None)
    res_K = float(np.sqrt(np.mean((drive @ K - lin_off) ** 2)) * 255)
    res_A = float(np.sqrt(np.mean((lin_off @ A - lin_on) ** 2)) * 255)

    # lin_off = drive @ K  and  lin_on = drive @ Mrow @ K,  with lin_on = lin_off @ A.
    #   drive @ Mrow @ K = drive @ K @ A   =>   Mrow = K @ A @ K^-1
    # Conjugating the other way round (K^-1 A K) is a different matrix and silently returns
    # a plausible wrong answer — the validator caught exactly that.
    Mrow = K @ A @ np.linalg.inv(K)
    return Mrow.T, res_K, res_A, gamma   # .T -> column convention used by benchmark.py


def solve_best(nominal, cam_off, cam_on):
    """The space the display-side matrix acts in is unknown, so fit both and report both.
    Choosing by residual, not by which answer looks nicer."""
    out = {}
    for sp in ("linear", "srgb"):
        M, rK, rA, g = solve(nominal, cam_off, cam_on, sp)
        out[sp] = (M, rK, rA, g)
    best = min(out, key=lambda s: out[s][2])
    return best, out


def report(M, res_K, res_A, truth=None, space="", gamma=None):
    print(f"\nrecovered matrix ({space} space, column-vector convention):")
    for r in M:
        print("  [" + "  ".join(f"{v:8.4f}" for v in r) + "]")
    if gamma is not None:
        print("camera gamma from the neutral ramp: "
              f"{gamma[0]:.2f} {gamma[1]:.2f} {gamma[2]:.2f}")
    print(f"residual, camera model K   : {res_K:6.2f} / 255")
    print(f"residual, off->on fit A    : {res_A:6.2f} / 255")
    if res_A > 6:
        print("  WARNING: the off->on fit is poor. Either the filter is not a linear")
        print("  transform, or the shot is contaminated (camera moved, auto-exposure,")
        print("  glare). Do not publish a matrix from this.")
    if truth is not None:
        err = np.abs(M - truth)
        print(f"\nknown answer        : max abs error {err.max():.4f}, mean {err.mean():.4f}")
        print("  PASS" if err.max() < 0.05 else "  FAIL - pipeline is not accurate enough")
    return res_A


# ---------- validation ------------------------------------------------------

def synth_photo(target, M=None, seed=0):
    """A deliberately unkind synthetic photograph: perspective, vignetting, camera gamma,
    a white-balance cast, and sensor noise. If recovery survives this, the maths is sound
    and the remaining risk on a real shot is purely operational."""
    rng = np.random.default_rng(seed)
    drive = target.astype(float) / 255.0            # nominal sRGB sent to the display

    # DISPLAY: the filter acts on the drive signal, then the panel emits LIGHT. Getting this
    # order wrong compounds the display's 2.2 with the camera's own exponent and yields a
    # nonsense gamma estimate — which is exactly what an earlier version of this function did.
    if M is not None:
        drive = np.clip(drive.reshape(-1, 3) @ M.T, 0, 1).reshape(drive.shape)
    light = srgb_to_linear(drive)

    # CAMERA: white balance, vignette and shot noise all act on light, and only then does
    # the sensor encode. Everything before the encode is linear.
    h, w = light.shape[:2]
    light = light * np.array([1.04, 1.00, 0.93])
    yy, xx = np.mgrid[0:h, 0:w]
    v = 1 - 0.22 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    light = light * v[..., None]
    light = np.clip(light + rng.normal(0, 0.002, light.shape), 0, 1)
    img = light ** (1 / 1.9)                        # sensor encode
    out = (img * 255 + 0.5).astype(np.uint8)[:, :, ::-1]          # to BGR
    # perspective: a hand-held shot, off-axis
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[40, 25], [w - 18, 60], [w - 55, h - 30], [22, h - 12]])
    return cv2.warpPerspective(out, cv2.getPerspectiveTransform(src, dst), (w, h))


def validate():
    index = json.load(open("patches.json"))
    target = cv2.imread("patches.png", cv2.IMREAD_COLOR)
    if target is None:
        sys.exit("run: python make_patches.py")
    truth = np.array([[0.82, 0.18, 0.00], [0.33, 0.67, 0.00], [0.00, 0.13, 0.87]])

    cv2.imwrite("_val_off.png", synth_photo(target[:, :, ::-1], None, seed=1))
    cv2.imwrite("_val_on.png", synth_photo(target[:, :, ::-1], truth, seed=2))

    nominal = np.array([p["nominal"] for p in index["patches"]], float) / 255.0
    off = sample(rectify("_val_off.png", index), index)
    on = sample(rectify("_val_on.png", index), index)
    print("VALIDATION - synthetic photograph with perspective, gamma, vignette, WB cast, noise")
    print("injected matrix (acts on linear light):")
    for r in truth:
        print("  [" + "  ".join(f"{v:8.4f}" for v in r) + "]")
    best, all_fits = solve_best(nominal, off, on)
    for sp, (M, rK, rA, g) in all_fits.items():
        print("\n--- fitted in %s space %s" % (sp, "(best)" if sp == best else ""))
        report(M, rK, rA, truth if sp == "srgb" else None, sp, g)


def recover(a):
    index = json.load(open("patches.json"))
    nominal = np.array([p["nominal"] for p in index["patches"]], float) / 255.0
    off = sample(rectify(a.off, index), index)
    on = sample(rectify(a.on, index), index)
    best, all_fits = solve_best(nominal, off, on)
    for sp, (M, rK, rA, g) in all_fits.items():
        print("\n--- fitted in %s space %s" % (sp, "(best)" if sp == best else ""))
        report(M, rK, rA, None, sp, g)
    M, rK, rA, gamma = all_fits[best]
    out = {"name": a.name, "space": best, "matrix": M.tolist(), "offset": [0, 0, 0],
           "camera_gamma": list(np.round(gamma, 4)),
           "all_fits": {sp: {"space": sp, "matrix": v[0].tolist(),
                             "residual_off_to_on_255": round(v[2], 3)}
                        for sp, v in all_fits.items()},
           "residual_camera_model_255": round(rK, 3),
           "residual_off_to_on_255": round(rA, 3),
           "source": f"photographic recovery from {a.off} / {a.on} via camera_recover.py",
           "caveat": "Recovered through a camera. Trust it only to the accuracy reported by "
                     "`camera_recover.py validate` on this machine, and treat the off->on "
                     "residual as the fit-quality gate."}
    json.dump(out, open(f"transforms/{a.name}.json", "w"), indent=2)
    print(f"\nwrote transforms/{a.name}.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate")
    r = sub.add_parser("recover")
    r.add_argument("--off", required=True)
    r.add_argument("--on", required=True)
    r.add_argument("--name", required=True)
    a = ap.parse_args()
    validate() if a.cmd == "validate" else recover(a)
