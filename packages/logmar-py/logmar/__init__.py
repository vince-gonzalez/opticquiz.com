"""logmar — convert between visual-acuity notations: logMAR, Snellen (20/x or 6/x), and decimal.

logMAR = log10(MAR) = -log10(decimal acuity); decimal = 1 / MAR. Snellen m/x has decimal = m/x.
Pure arithmetic, no dependencies. 20/20 = 0.0 logMAR = 1.0 decimal; larger logMAR = worse acuity.

    import logmar
    logmar.snellen_to_logmar("20/40")   # 0.301
    logmar.logmar_to_snellen(0.3)       # "20/40"
    logmar.decimal_to_logmar(0.5)       # 0.301
"""
import math
import re

__version__ = "0.1.0"
__all__ = [
    "snellen_to_decimal", "decimal_to_logmar", "logmar_to_decimal",
    "snellen_to_logmar", "logmar_to_snellen", "decimal_to_snellen",
]

_SNELLEN = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*$")


def snellen_to_decimal(s):
    m = _SNELLEN.match(str(s))
    if not m:
        raise ValueError('Snellen acuity must look like "20/40" or "6/12".')
    num, den = float(m.group(1)), float(m.group(2))
    if num <= 0 or den <= 0:
        raise ValueError("Snellen numerator and denominator must be > 0.")
    return num / den


def decimal_to_logmar(d):
    if d <= 0:
        raise ValueError("decimal acuity must be > 0.")
    v = -math.log10(d)
    return 0.0 if v == 0 else v  # avoid -0.0 at 20/20


def logmar_to_decimal(l):
    return 10 ** (-l)


def snellen_to_logmar(s):
    return decimal_to_logmar(snellen_to_decimal(s))


def decimal_to_snellen(d, base=20):
    if d <= 0:
        raise ValueError("decimal acuity must be > 0.")
    return "%d/%d" % (base, round(base / d))


def logmar_to_snellen(l, base=20):
    return decimal_to_snellen(logmar_to_decimal(l), base)
