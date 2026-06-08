"""Server-side bounds for workout fields clients submit (anti-abuse)."""

MAX_XP_PER_WORKOUT = 2500
MAX_WORKOUT_LIST = 500


def clamp_xp_earned(
    xp: int,
    total_sets: int,
    total_reps: int,
    duration_minutes: int,
) -> int:
    """
    Cap XP using workout volume so arbitrary client values cannot inflate profile XP.
    Honest sessions stay under the cap; inflated totals raise the allowed ceiling modestly.
    """
    try:
        xp = int(xp)
    except (TypeError, ValueError):
        xp = 0
    xp = max(0, xp)

    try:
        sets = max(0, int(total_sets))
    except (TypeError, ValueError):
        sets = 0
    try:
        reps = max(0, int(total_reps))
    except (TypeError, ValueError):
        reps = 0
    try:
        duration = max(0, int(duration_minutes))
    except (TypeError, ValueError):
        duration = 0

    volume_cap = sets * 35 + reps // 2 + duration * 10
    cap = min(MAX_XP_PER_WORKOUT, max(volume_cap, sets + reps // 20 + duration))
    return min(xp, cap)
