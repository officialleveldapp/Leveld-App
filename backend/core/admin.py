from django.contrib import admin
from .models import (
    Profile, Workout, Badge, UserBadge,
    Group, GroupMember, GroupInvite, Challenge, WorkoutFeed, FeedReaction, DailyTip,
    WorkoutLibraryTemplate,
    NotificationPersonalityPreset,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('username', 'xp', 'level', 'current_streak', 'total_workouts')
    search_fields = ('username',)


@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ('user', 'workout_date', 'total_sets', 'total_reps', 'xp_earned')
    list_filter = ('workout_date',)


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'requirement_type', 'requirement_value', 'xp_reward')


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge', 'earned_at')


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'is_public', 'created_at')


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('group', 'user', 'joined_at')


@admin.register(GroupInvite)
class GroupInviteAdmin(admin.ModelAdmin):
    list_display = ('group', 'inviter', 'invitee', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'challenge_type', 'start_date', 'end_date')


@admin.register(WorkoutFeed)
class WorkoutFeedAdmin(admin.ModelAdmin):
    list_display = ('user', 'content', 'likes_count', 'created_at')


@admin.register(FeedReaction)
class FeedReactionAdmin(admin.ModelAdmin):
    list_display = ('feed', 'user', 'reaction_type', 'created_at')


@admin.register(DailyTip)
class DailyTipAdmin(admin.ModelAdmin):
    list_display = ('text', 'is_active', 'sort_order', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('text',)


@admin.register(WorkoutLibraryTemplate)
class WorkoutLibraryTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'source_name', 'source_url', 'is_active', 'sort_order', 'updated_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'subtitle', 'source_name', 'source_url')


@admin.register(NotificationPersonalityPreset)
class NotificationPersonalityPresetAdmin(admin.ModelAdmin):
    list_display = ('slug', 'label', 'enabled', 'sort_order', 'updated_at')
    list_editable = ('enabled', 'sort_order')
    list_filter = ('enabled',)
    search_fields = ('slug', 'label')
    ordering = ('sort_order', 'slug')
    readonly_fields = ('updated_at',)
