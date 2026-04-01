"""
Seed default badges. Run with: python manage.py seed_badges
"""
from django.core.management.base import BaseCommand
from core.models import Badge


DEFAULT_BADGES = [
    {
        'name': 'First Step',
        'description': 'Complete your first workout',
        'icon': 'check-circle',
        'requirement_type': 'total_workouts',
        'requirement_value': 1,
        'xp_reward': 50,
    },
    {
        'name': 'Week Warrior',
        'description': 'Maintain a 7-day streak',
        'icon': 'flame',
        'requirement_type': 'current_streak',
        'requirement_value': 7,
        'xp_reward': 100,
    },
    {
        'name': 'Consistent',
        'description': 'Complete 10 workouts',
        'icon': 'target',
        'requirement_type': 'total_workouts',
        'requirement_value': 10,
        'xp_reward': 150,
    },
    {
        'name': 'Dedicated',
        'description': 'Maintain a 30-day streak',
        'icon': 'zap',
        'requirement_type': 'current_streak',
        'requirement_value': 30,
        'xp_reward': 500,
    },
    {
        'name': 'Century Club',
        'description': 'Complete 100 workouts',
        'icon': 'trophy',
        'requirement_type': 'total_workouts',
        'requirement_value': 100,
        'xp_reward': 1000,
    },
    {
        'name': 'Level 10',
        'description': 'Reach level 10',
        'icon': 'star',
        'requirement_type': 'level',
        'requirement_value': 10,
        'xp_reward': 200,
    },
    {
        'name': 'XP Hunter',
        'description': 'Earn 5000 XP',
        'icon': 'award',
        'requirement_type': 'xp',
        'requirement_value': 5000,
        'xp_reward': 300,
    },
]


def seed():
    for badge_data in DEFAULT_BADGES:
        Badge.objects.get_or_create(
            name=badge_data['name'],
            defaults=badge_data,
        )
