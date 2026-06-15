from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models import (
    Profile,
    Workout,
    Group,
    GroupMember,
    Challenge,
    UserBadge,
    Badge,
    DailyTip,
    WorkoutLibraryTemplate,
    NotificationPersonalityPreset,
)

User = get_user_model()


class AdminUserListSerializer(serializers.ModelSerializer):
    """Flat User + Profile row for the users table."""

    username = serializers.CharField(source='profile.username', default=None, read_only=True)
    avatar_url = serializers.CharField(source='profile.avatar_url', default=None, read_only=True)
    level = serializers.IntegerField(source='profile.level', default=None, read_only=True)
    xp = serializers.IntegerField(source='profile.xp', default=None, read_only=True)
    current_streak = serializers.IntegerField(source='profile.current_streak', default=None, read_only=True)
    total_workouts = serializers.IntegerField(source='profile.total_workouts', default=None, read_only=True)
    is_pro = serializers.BooleanField(source='profile.is_pro', default=False, read_only=True)
    pro_expires_at = serializers.DateTimeField(source='profile.pro_expires_at', default=None, read_only=True)
    last_workout_date = serializers.DateField(source='profile.last_workout_date', default=None, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'avatar_url', 'level', 'xp', 'current_streak',
            'total_workouts', 'is_pro', 'pro_expires_at', 'last_workout_date',
            'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login',
        ]


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        exclude = ['user']


class AdminWorkoutSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source='user.username', default=None, read_only=True)

    class Meta:
        model = Workout
        fields = [
            'id', 'user_id', 'username', 'workout_date', 'total_sets', 'total_reps',
            'duration_minutes', 'calories_burned', 'xp_earned', 'notes', 'exercises', 'created_at',
        ]


class AdminUserDetailSerializer(serializers.ModelSerializer):
    profile = AdminProfileSerializer(read_only=True)
    recent_workouts = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    friends_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'profile', 'recent_workouts', 'groups', 'badges',
            'followers_count', 'following_count', 'friends_count',
        ]

    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_recent_workouts(self, obj):
        prof = self._profile(obj)
        if not prof:
            return []
        qs = prof.workouts.all()[:10]
        return AdminWorkoutSerializer(qs, many=True).data

    def get_groups(self, obj):
        prof = self._profile(obj)
        if not prof:
            return []
        memberships = prof.group_memberships.select_related('group')
        return [{'id': str(m.group_id), 'name': m.group.name} for m in memberships]

    def get_badges(self, obj):
        prof = self._profile(obj)
        if not prof:
            return []
        earned = prof.user_badges.select_related('badge')
        return [
            {'id': str(ub.badge_id), 'name': ub.badge.name, 'earned_at': ub.earned_at}
            for ub in earned
        ]

    def get_following_count(self, obj):
        prof = self._profile(obj)
        return prof.following_set.count() if prof else 0

    def get_followers_count(self, obj):
        prof = self._profile(obj)
        return prof.followers_set.count() if prof else 0

    def get_friends_count(self, obj):
        prof = self._profile(obj)
        if not prof:
            return 0
        following_ids = set(prof.following_set.values_list('following_id', flat=True))
        follower_ids = set(prof.followers_set.values_list('follower_id', flat=True))
        return len(following_ids & follower_ids)


class AdminGroupSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', default=None, read_only=True)
    member_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'is_public', 'created_by',
            'created_by_username', 'member_count', 'created_at',
        ]


class AdminGroupDetailSerializer(AdminGroupSerializer):
    members = serializers.SerializerMethodField()
    challenges = serializers.SerializerMethodField()

    class Meta(AdminGroupSerializer.Meta):
        fields = AdminGroupSerializer.Meta.fields + ['members', 'challenges']

    def get_members(self, obj):
        members = obj.members.select_related('user')
        return [
            {'user_id': m.user_id, 'username': m.user.username, 'joined_at': m.joined_at}
            for m in members
        ]

    def get_challenges(self, obj):
        return AdminChallengeSerializer(obj.challenges.all(), many=True).data


class AdminChallengeSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', default=None, read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            'id', 'name', 'description', 'challenge_type', 'group', 'group_name',
            'start_date', 'end_date', 'target_value', 'is_active', 'participant_count', 'created_at',
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()


# --- Content CRUD serializers ---------------------------------------------

class DailyTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTip
        fields = '__all__'


class WorkoutLibraryTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutLibraryTemplate
        fields = '__all__'


class NotificationPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPersonalityPreset
        fields = '__all__'


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'
