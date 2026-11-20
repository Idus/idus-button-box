#!/usr/bin/env python3
"""Idus Button Box - a virtual joystick with 32 buttons (/dev/uinput).

Games see an ordinary joystick called "Idus Button Box" - under Wine/Proton too (Star Citizen,
DCS, Elite ...). Started by the plugin when OpenDeck starts; lives as long as the plugin.
One command per line on stdin:
    d N     press button N (1-32)
    u N     release button N
    r       release every button
    quit
Prints "ready <sysname> <event> <js>" when the joystick exists (e.g. "ready input42 event23 js1";
"-" when unknown), or "error <kind> <text>" and exits (kind: access, missing, other). Releases
every button, removes the joystick and exits when stdin closes, so it never outlives the plugin.

Buttons 1-16 are BTN_TRIGGER ... BTN_DEAD and 17-32 are BTN_TRIGGER_HAPPY1-16, in that order, so
button N is button N in every game. Two centred X/Y axes that never move make every layer (udev,
SDL, Wine) treat it as a joystick; it has no gamepad buttons, so it is never cut down to a gamepad.
IDUS_BB_DRYRUN=1: no device - every event is printed as "ev <type> <code> <value>" (tests).
Only the Python standard library; never needs root (your user needs write access to /dev/uinput).
"""
import errno
import fcntl
import os
import struct
import sys
import time

UI_SET_EVBIT, UI_SET_KEYBIT, UI_SET_ABSBIT = 0x40045564, 0x40045565, 0x40045567
UI_DEV_SETUP, UI_ABS_SETUP = 0x405C5503, 0x401C5504   # uinput_setup = 92 bytes, uinput_abs_setup = 28
UI_DEV_CREATE, UI_DEV_DESTROY = 0x5501, 0x5502
UI_GET_SYSNAME_64 = 0x8040552C                       # _IOC(_IOC_READ, 'U', 44, 64)
EV_SYN, EV_KEY, EV_ABS = 0x00, 0x01, 0x03
SYN_REPORT, ABS_X, ABS_Y = 0, 0x00, 0x01
BUTTONS = list(range(0x120, 0x130)) + list(range(0x2C0, 0x2D0))  # BTN_TRIGGER..BTN_DEAD, BTN_TRIGGER_HAPPY1..16
BUS_VIRTUAL = 0x06
VENDOR, PRODUCT, VERSION = 0x1209, 0x4242, 1
NAME = b"Idus Button Box"
DRY = os.environ.get("IDUS_BB_DRYRUN") == "1"


def say(line):
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def open_device():
    fd = os.open("/dev/uinput", os.O_WRONLY | os.O_NONBLOCK)
    try:
        fcntl.ioctl(fd, UI_SET_EVBIT, EV_KEY)
        for code in BUTTONS:
            fcntl.ioctl(fd, UI_SET_KEYBIT, code)
        fcntl.ioctl(fd, UI_SET_EVBIT, EV_ABS)
        for axis in (ABS_X, ABS_Y):  # centred, never moved
            fcntl.ioctl(fd, UI_SET_ABSBIT, axis)
            # code, (value, minimum, maximum, fuzz, flat, resolution)
            fcntl.ioctl(fd, UI_ABS_SETUP, struct.pack("H2xiiiiii", axis, 0, -32767, 32767, 0, 0, 0))
        fcntl.ioctl(fd, UI_DEV_SETUP, struct.pack("HHHH80sI", BUS_VIRTUAL, VENDOR, PRODUCT, VERSION, NAME, 0))
        fcntl.ioctl(fd, UI_DEV_CREATE)
    except OSError:
        os.close(fd)
        raise
    return fd


def nodes(fd):
    """sysname, eventN and jsN of the new joystick (for the settings panel and jstest)."""
    try:
        buf = fcntl.ioctl(fd, UI_GET_SYSNAME_64, bytes(64))
        sysname = buf.split(b"\0", 1)[0].decode() or "-"
    except OSError:
        return "-", "-", "-"
    event = js = "-"
    for _ in range(20):  # the kernel adds eventN / jsN a moment after the device
        try:
            names = os.listdir(f"/sys/devices/virtual/input/{sysname}")
        except OSError:
            names = []
        event = next((n for n in names if n.startswith("event")), "-")
        js = next((n for n in names if n.startswith("js")), "-")
        if event != "-" and js != "-":
            break
        time.sleep(0.05)
    return sysname, event, js


def emit(fd, typ, code, value):
    if DRY:
        say(f"ev {typ} {code} {value}")
        if os.environ.get("IDUS_BB_DRYLOG"):
            with open(os.environ["IDUS_BB_DRYLOG"], "a") as log:
                log.write(f"{time.time():.3f} {typ} {code} {value}\n")
        return
    os.write(fd, struct.pack("llHHi", 0, 0, typ, code, value))  # struct input_event (time 0 = now)


def main():
    fd = None
    if not DRY:
        try:
            fd = open_device()
        except OSError as e:
            if e.errno in (errno.EACCES, errno.EPERM):
                kind = "access"
            elif e.errno in (errno.ENOENT, errno.ENODEV, errno.ENXIO):
                kind = "missing"
            else:
                kind = "other"
            say(f"error {kind} {e.strerror or e}")
            return 2
        say("ready " + " ".join(nodes(fd)))
    else:
        say("ready dry-run - -")
    down = set()

    def button(n, value):
        if not 1 <= n <= len(BUTTONS):
            return
        if value and n in down or not value and n not in down:
            return
        (down.add if value else down.discard)(n)
        emit(fd, EV_KEY, BUTTONS[n - 1], value)
        emit(fd, EV_SYN, SYN_REPORT, 0)

    try:
        for line in sys.stdin:
            parts = line.split()
            if not parts:
                continue
            cmd = parts[0]
            if cmd == "quit":
                break
            if cmd == "r":
                for n in sorted(down):
                    button(n, 0)
                continue
            if cmd in ("d", "u") and len(parts) > 1:
                try:
                    n = int(parts[1])
                except ValueError:
                    continue
                button(n, 1 if cmd == "d" else 0)
    except OSError as e:
        say(f"error other {e.strerror or e}")
        return 3
    finally:
        try:
            for n in sorted(down):
                button(n, 0)
        except OSError:
            pass
        if fd is not None:
            try:
                fcntl.ioctl(fd, UI_DEV_DESTROY)
            except OSError:
                pass
            os.close(fd)
    return 0


if __name__ == "__main__":
    sys.exit(main())
