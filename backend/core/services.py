"""
Business logic for workout creation: streak calculation, XP, level, badge awards, challenge progress.
"""
import math
from datetime import timedelta
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import Profile, Badge, UserBadge, ChallengeParticipant, ExerciseStat


def parse_exercise_volume(exercises):
    """
    Normalize a workout's exercises JSON into {name: (sets, reps)} totals.
    Reps = sets * reps_per_set, matching the client workout log semantics.
    """
    totals = {}
    for ex in exercises or []:
        name = (ex.get('name') or '').strip()
        if not name:
            continue
        try:
            n_sets = max(0, int(ex.get('sets') or 0))
        except (TypeError, ValueError):
            n_sets = 0
        try:
            reps_per_set = max(0, int(ex.get('reps') or 0))
        except (TypeError, ValueError):
            reps_per_set = 0
        prev_sets, prev_reps = totals.get(name, (0, 0))
        totals[name] = (prev_sets + n_sets, prev_reps + n_sets * reps_per_set)
    return totals


def _apply_exercise_stats(profile, workout):
    """Incrementally fold this workout's volume into the per-exercise aggregates."""
    for name, (n_sets, n_reps) in parse_exercise_volume(workout.exercises).items():
        _, created = ExerciseStat.objects.get_or_create(
            user=profile,
            exercise_name=name,
            defaults={'total_sets': n_sets, 'total_reps': n_reps},
        )
        if not created:
            ExerciseStat.objects.filter(user=profile, exercise_name=name).update(
                total_sets=F('total_sets') + n_sets,
                total_reps=F('total_reps') + n_reps,
            )


def process_workout_created(workout):
    """
    Called after a new workout is saved.
    Updates the user's profile: total_workouts, streak, xp, level, last_workout_date.
    Then updates exercise aggregates, badge awards, and challenge progress.

    Runs in a transaction with the profile row locked so concurrent workout
    posts for the same user cannot lose counter updates.
    """
    with transaction.atomic():
        profile = (
            Profile.objects.select_for_update().get(pk=workout.user_id)
        )

        # Update total workouts
        profile.total_workouts += 1

        # Streak calculation
        today = workout.workout_date
        if profile.last_workout_date:
            if profile.last_workout_date == today - timedelta(days=1):
                profile.current_streak += 1
            elif profile.last_workout_date == today:
                pass
            else:
                profile.current_streak = 1
        else:
            profile.current_streak = 1

        profile.longest_streak = max(profile.longest_streak, profile.current_streak)

        # XP and level
        profile.xp += workout.xp_earned
        profile.level = math.floor(profile.xp / 100.0) + 1

        # Last workout date
        profile.last_workout_date = today
        profile.save(update_fields=[
            'total_workouts',
            'current_streak',
            'longest_streak',
            'xp',
            'level',
            'last_workout_date',
            'updated_at',
        ])

        # Per-exercise lifetime aggregates (read by /workouts/exercise-stats/)
        _apply_exercise_stats(profile, workout)

        # Check and award badges
        check_and_award_badges(profile)

        # Update challenge progress
        newly_completed_challenges = update_challenge_progress(profile, workout)
    return newly_completed_challenges


def check_and_award_badges(profile, use_live_counts=False):
    """Check all badges and award any the user now qualifies for. Returns newly earned badges.

    When use_live_counts=True, derives total_workouts from actual Workout rows
    instead of trusting the profile counter — used for catch-up syncs.
    """
    from .models import Workout

    badges = Badge.objects.all()
    if not badges.exists():
        return []

    earned_badge_ids = set(
        UserBadge.objects.filter(user=profile).values_list('badge_id', flat=True)
    )

    if use_live_counts:
        live_workout_count = Workout.objects.filter(user=profile).count()
        if live_workout_count != profile.total_workouts:
            profile.total_workouts = live_workout_count
            profile.save(update_fields=['total_workouts'])
    else:
        live_workout_count = profile.total_workouts

    profile_stats = {
        'total_workouts': live_workout_count,
        'current_streak': profile.current_streak,
        'longest_streak': profile.longest_streak,
        'level': profile.level,
        'xp': profile.xp,
    }

    newly_earned = []
    for badge in badges:
        if badge.id in earned_badge_ids:
            continue

        stat_value = profile_stats.get(badge.requirement_type, 0)
        if stat_value >= badge.requirement_value:
            UserBadge.objects.create(user=profile, badge=badge)
            newly_earned.append(badge)

    return newly_earned


def update_challenge_progress(profile, workout):
    """Update progress for active challenges. Returns payloads for challenges just completed."""
    today = timezone.now().date()
    newly_completed = []
    participations = ChallengeParticipant.objects.filter(
        user=profile,
        completed=False,
        challenge__start_date__lte=today,
        challenge__end_date__gte=today,
    ).select_related('challenge', 'challenge__group')

    for p in participations:
        challenge = p.challenge
        was_completed = p.completed
        if challenge.challenge_type == 'total_workouts':
            p.progress += 1
        elif challenge.challenge_type == 'total_xp':
            p.progress += workout.xp_earned
        elif challenge.challenge_type == 'streak':
            p.progress = max(p.progress, profile.current_streak)
        elif challenge.challenge_type == 'total_reps':
            p.progress += workout.total_reps

        if p.progress >= challenge.target_value:
            p.completed = True
        p.save()

        if not was_completed and p.completed:
            g = challenge.group
            newly_completed.append(
                {
                    'participation_id': str(p.id),
                    'challenge_id': str(challenge.id),
                    'challenge_name': challenge.name,
                    'group_id': str(g.id),
                    'group_name': g.name,
                }
            )

    return newly_completed
