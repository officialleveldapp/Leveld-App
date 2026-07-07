from django.contrib.auth.models import User
from rest_framework import serializers

from .workout_integrity import clamp_xp_earned
from .models import (
    Profile, Workout, Badge, UserBadge, Follow,
    Group, GroupMember, GroupInvite, Challenge, ChallengeParticipant,
    WorkoutFeed, FeedReaction, DailyTip,
    WorkoutTemplate, TemplateExercise, WorkoutLibraryTemplate, PersonalRecord,
    NotificationPersonalityPreset,
)


# ── Auth ──────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    username = serializers.CharField(max_length=150)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if Profile.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],  # Django username = email
            email=validated_data['email'],
            password=validated_data['password'],
        )
        Profile.objects.create(
            user=user,
            username=validated_data['username'],
            xp=0,
            level=1,
            current_streak=0,
            longest_streak=0,
            total_workouts=0,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class AppleAuthSerializer(serializers.Serializer):
    identity_token = serializers.CharField()
    full_name = serializers.CharField(required=False, allow_blank=True)


# ── Profile ───────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user_id', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    signed_in_with_google = serializers.SerializerMethodField()
    signed_in_with_apple = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 'email', 'username', 'signed_in_with_google', 'signed_in_with_apple', 'avatar_url', 'xp', 'level',
            'current_streak', 'longest_streak', 'total_workouts',
            'goal', 'experience_level', 'workout_frequency',
            'onboarding_completed',
            'body_weight_lbs', 'height_inches', 'starting_bench_lbs',
            'training_environment', 'session_length_minutes',
            'preferred_exercises', 'last_workout_date',
            'is_pro', 'pro_expires_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'signed_in_with_google', 'xp', 'level', 'current_streak',
            'longest_streak', 'total_workouts', 'last_workout_date', 'is_pro',
            'pro_expires_at', 'created_at', 'updated_at',
        ]

    def get_signed_in_with_google(self, obj):
        return bool(obj.google_sub)

    def get_signed_in_with_apple(self, obj):
        return bool(obj.apple_sub)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """PATCH /api/profile/ — editable account + training basics."""

    id = serializers.IntegerField(source='user_id', read_only=True)
    email = serializers.EmailField(source='user.email', required=False)
    signed_in_with_google = serializers.SerializerMethodField()
    signed_in_with_apple = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 'email', 'username', 'signed_in_with_google', 'signed_in_with_apple',
            'goal', 'experience_level', 'workout_frequency',
            'body_weight_lbs', 'height_inches', 'starting_bench_lbs',
            'training_environment', 'session_length_minutes',
            'onboarding_completed',
        ]
        read_only_fields = ['id', 'signed_in_with_google', 'signed_in_with_apple']
        extra_kwargs = {
            'body_weight_lbs': {'required': False, 'allow_null': True},
            'height_inches': {'required': False, 'allow_null': True},
            'starting_bench_lbs': {'required': False, 'allow_null': True},
            'session_length_minutes': {'required': False, 'allow_null': True},
        }

    def get_signed_in_with_google(self, obj):
        return bool(obj.google_sub)

    def get_signed_in_with_apple(self, obj):
        return bool(obj.apple_sub)

    def _oauth_linked(self, profile) -> bool:
        return bool(profile.google_sub or profile.apple_sub)

    def validate_username(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('Username must be at least 2 characters.')
        if len(value) > 150:
            raise serializers.ValidationError('Username is too long.')
        profile = self.instance
        if Profile.objects.filter(username__iexact=value).exclude(pk=profile.pk).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        profile = self.instance
        if self._oauth_linked(profile):
            provider = 'Apple' if profile.apple_sub else 'Google'
            raise serializers.ValidationError(
                f'Email is managed by your {provider} account and cannot be changed here.',
            )
        email = (value or '').strip().lower()
        if not email:
            raise serializers.ValidationError('Email is required.')
        user = profile.user
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate(self, attrs):
        if self.instance and self._oauth_linked(self.instance) and 'user' in attrs:
            attrs.pop('user', None)
        return super().validate(attrs)

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data and 'email' in user_data and not self._oauth_linked(instance):
            email = user_data['email']
            user = instance.user
            user.email = email
            user.username = email
            user.save(update_fields=['email', 'username'])
        return super().update(instance, validated_data)


class ProfilePublicSerializer(serializers.ModelSerializer):
    """Minimal profile info for leaderboard / feed."""
    id = serializers.IntegerField(source='user_id', read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'username', 'avatar_url', 'xp', 'level']


class NotificationPersonalityPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPersonalityPreset
        fields = [
            'slug',
            'label',
            'subtitle',
            'sort_order',
            'motivation_messages',
            'workout_messages',
            'social_messages',
        ]


# ── Workout ───────────────────────────────────────────

class WorkoutSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.user_id', read_only=True)

    class Meta:
        model = Workout
        fields = [
            'id', 'user_id', 'workout_date', 'exercises',
            'total_sets', 'total_reps', 'duration_minutes',
            'calories_burned', 'xp_earned', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'user_id', 'created_at']


class WorkoutCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = [
            'workout_date', 'exercises', 'total_sets', 'total_reps',
            'duration_minutes', 'calories_burned', 'xp_earned', 'notes',
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        xp = attrs.get('xp_earned', 0)
        sets = attrs.get('total_sets', 0)
        reps = attrs.get('total_reps', 0)
        duration = attrs.get('duration_minutes', 0)
        attrs['xp_earned'] = clamp_xp_earned(xp, sets, reps, duration)
        return attrs


# ── Badge ─────────────────────────────────────────────

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            'id', 'name', 'description', 'icon',
            'requirement_type', 'requirement_value',
            'xp_reward', 'created_at',
        ]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'user_id', 'badge_id', 'earned_at', 'badge']


class DailyTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTip
        fields = ['id', 'text']


# ── Follow ────────────────────────────────────────────

class FollowSerializer(serializers.ModelSerializer):
    follower = ProfilePublicSerializer(read_only=True)
    following = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'created_at']


# ── Group ─────────────────────────────────────────────

class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    is_public = serializers.BooleanField(read_only=True)

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'created_by_id',
            'is_public', 'created_at', 'member_count',
        ]
        read_only_fields = ['id', 'created_by_id', 'created_at', 'is_public']

    def get_member_count(self, obj):
        return obj.members.count()


class GroupMemberSerializer(serializers.ModelSerializer):
    user = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = GroupMember
        fields = ['id', 'group_id', 'user', 'joined_at']


class GroupInviteSerializer(serializers.ModelSerializer):
    group = GroupSerializer(read_only=True)
    inviter = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = GroupInvite
        fields = ['id', 'group', 'inviter', 'status', 'created_at']


# ── Challenge ─────────────────────────────────────────

class ChallengeParticipantSerializer(serializers.ModelSerializer):
    user = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = ChallengeParticipant
        fields = ['id', 'user', 'progress', 'completed', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ChallengeSerializer(serializers.ModelSerializer):
    participant_count = serializers.SerializerMethodField()
    participants = ChallengeParticipantSerializer(many=True, read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_joined = serializers.SerializerMethodField()
    my_progress = serializers.SerializerMethodField()
    created_by = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = Challenge
        fields = [
            'id', 'group_id', 'name', 'description',
            'challenge_type', 'start_date', 'end_date',
            'target_value', 'created_at', 'is_active',
            'participant_count', 'participants', 'is_joined',
            'my_progress', 'created_by',
        ]
        read_only_fields = ['id', 'created_at']

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_is_joined(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user.profile).exists()

    def get_my_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        p = obj.participants.filter(user=request.user.profile).first()
        return p.progress if p else 0


class ChallengeCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, default='')
    challenge_type = serializers.ChoiceField(
        choices=['total_workouts', 'total_xp', 'streak', 'total_reps'],
        default='total_workouts',
    )
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    target_value = serializers.IntegerField(min_value=1)


# ── Workout Templates ─────────────────────────────────

class TemplateExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateExercise
        fields = ['id', 'name', 'default_sets', 'default_reps', 'order']
        read_only_fields = ['id']


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    exercises = TemplateExerciseSerializer(many=True, read_only=True)
    exercise_count = serializers.SerializerMethodField()
    user = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = WorkoutTemplate
        fields = [
            'id', 'user', 'name', 'color', 'icon',
            'exercises', 'exercise_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_exercise_count(self, obj):
        return obj.exercises.count()


class WorkoutTemplateCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    color = serializers.CharField(max_length=7, default='#4C91FF')
    icon = serializers.CharField(max_length=50, default='dumbbell')
    exercises = serializers.ListField(child=serializers.DictField(), required=False, default=list)


class WorkoutLibraryTemplateSerializer(serializers.ModelSerializer):
    exercise_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutLibraryTemplate
        fields = [
            'id',
            'name',
            'category',
            'subtitle',
            'source_name',
            'source_url',
            'color',
            'icon',
            'exercises',
            'exercise_count',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_exercise_count(self, obj):
        return len(obj.exercises or [])


class PersonalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalRecord
        fields = ['id', 'exercise_name', 'weight', 'reps', 'achieved_at']
        read_only_fields = ['id', 'achieved_at']


# ── Feed ──────────────────────────────────────────────

class FeedReactionSerializer(serializers.ModelSerializer):
    user = ProfilePublicSerializer(read_only=True)

    class Meta:
        model = FeedReaction
        fields = ['id', 'reaction_type', 'user', 'created_at']
        read_only_fields = ['id', 'created_at']


class FeedGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class WorkoutFeedSerializer(serializers.ModelSerializer):
    user = ProfilePublicSerializer(read_only=True)
    template = WorkoutTemplateSerializer(read_only=True)
    group = FeedGroupSerializer(read_only=True)
    reactions_summary = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutFeed
        fields = [
            'id', 'user_id', 'workout_id', 'template_id', 'group_id',
            'content', 'likes_count', 'created_at', 'user', 'template',
            'group', 'reactions_summary', 'my_reaction',
        ]
        read_only_fields = ['id', 'user_id', 'likes_count', 'created_at']

    def get_reactions_summary(self, obj):
        """Return counts per reaction type, e.g. {"fire": 3, "like": 1}"""
        from django.db.models import Count
        qs = obj.reactions.values('reaction_type').annotate(count=Count('id'))
        return {item['reaction_type']: item['count'] for item in qs}

    def get_my_reaction(self, obj):
        """Return the current user's reaction type, or null."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        reaction = obj.reactions.filter(user=request.user.profile).first()
        return reaction.reaction_type if reaction else None
