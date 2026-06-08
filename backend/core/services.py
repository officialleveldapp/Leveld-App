"""
Business logic for workout creation: streak calculation, XP, level, badge awards, challenge progress.
"""
import math
from datetime import timedelta
from django.utils import timezone
from .models import Profile, Badge, UserBadge, ChallengeParticipant


def process_workout_created(workout):
    """
    Called after a new workout is saved.
    Updates the user's profile: total_workouts, streak, xp, level, last_workout_date.
    Then checks for new badge awards and updates challenge progress.
    """
    profile = workout.user

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
    profile.save()

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
