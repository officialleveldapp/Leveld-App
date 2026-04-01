import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True,
    )
    username = models.CharField(max_length=150, unique=True)
    avatar_url = models.URLField(blank=True, null=True)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    total_workouts = models.IntegerField(default=0)
    goal = models.CharField(max_length=100, default='General Fitness')
    experience_level = models.CharField(max_length=50, default='Beginner')
    workout_frequency = models.IntegerField(default=3)
    preferred_exercises = models.JSONField(default=list, blank=True)
    last_workout_date = models.DateField(blank=True, null=True)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
    is_pro = models.BooleanField(default=False)
    pro_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class Workout(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='workouts',
    )
    workout_date = models.DateField(default=timezone.now)
    exercises = models.JSONField(default=list, blank=True)
    total_sets = models.IntegerField(default=0)
    total_reps = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)
    calories_burned = models.IntegerField(default=0)
    xp_earned = models.IntegerField(default=0)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-workout_date', '-created_at']
        indexes = [
            models.Index(fields=['user', '-workout_date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.workout_date}"


class Badge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    requirement_type = models.CharField(max_length=50)
    requirement_value = models.IntegerField()
    xp_reward = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class DailyTip(models.Model):
    text = models.CharField(max_length=280)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return self.text


class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='user_badges',
    )
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name='user_badges',
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'badge')

    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"


class Follow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='following_set',
    )
    following = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='followers_set',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.follower == self.following:
            raise ValidationError("Cannot follow yourself.")

    def __str__(self):
        return f"{self.follower.username} -> {self.following.username}"


class Friendship(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='friendships_sent',
    )
    friend = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='friendships_received',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'friend')

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.user == self.friend:
            raise ValidationError("Cannot befriend yourself.")

    def __str__(self):
        return f"{self.user.username} -> {self.friend.username} ({self.status})"


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='created_groups',
    )
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class GroupMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='members',
    )
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='group_memberships',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.group.name}"


class Challenge(models.Model):
    CHALLENGE_TYPE_CHOICES = [
        ('total_workouts', 'Total Workouts'),
        ('total_xp', 'Total XP'),
        ('streak', 'Streak'),
        ('total_reps', 'Total Reps'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='challenges',
    )
    created_by = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='created_challenges',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    challenge_type = models.CharField(max_length=50, choices=CHALLENGE_TYPE_CHOICES, default='total_workouts')
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    target_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.group.name})"

    @property
    def is_active(self):
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date


class ChallengeParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='challenge_participations',
    )
    progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('challenge', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.challenge.name} ({self.progress}/{self.challenge.target_value})"


class WorkoutTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='templates',
    )
    name = models.CharField(max_length=200)          # "Pull Day"
    color = models.CharField(max_length=7, default='#4C91FF')  # hex
    icon = models.CharField(max_length=50, default='dumbbell')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} – {self.name}"


class TemplateExercise(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        WorkoutTemplate,
        on_delete=models.CASCADE,
        related_name='exercises',
    )
    name = models.CharField(max_length=200)            # "Barbell Row"
    default_sets = models.IntegerField(default=3)
    default_reps = models.IntegerField(default=10)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.name} ({self.template.name})"


class WorkoutLibraryTemplate(models.Model):
    CATEGORY_CHOICES = [
        ('influencer', 'Influencer'),
        ('technical', 'Technical'),
        ('strength', 'Strength'),
        ('hypertrophy', 'Hypertrophy'),
        ('conditioning', 'Conditioning'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default='technical')
    subtitle = models.CharField(max_length=200, blank=True, default='')
    source_name = models.CharField(max_length=120, blank=True, default='')
    source_url = models.URLField(blank=True, default='')
    color = models.CharField(max_length=7, default='#4C91FF')
    icon = models.CharField(max_length=50, default='dumbbell')
    # [{name, default_sets, default_reps, order}, ...]
    exercises = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'sort_order']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return self.name


class PersonalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='personal_records',
    )
    exercise_name = models.CharField(max_length=200)
    weight = models.DecimalField(max_digits=7, decimal_places=1)
    reps = models.IntegerField(default=1)
    achieved_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'exercise_name')

    def __str__(self):
        return f"{self.user.username} – {self.exercise_name}: {self.weight} lbs"


class WorkoutFeed(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='feed_items',
    )
    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='feed_items',
    )
    template = models.ForeignKey(
        'WorkoutTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feed_items',
    )
    content = models.TextField()
    likes_count = models.IntegerField(default=0)  # total reactions count
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"


class FeedReaction(models.Model):
    REACTION_TYPES = [
        ('like', '❤️'),
        ('fire', '🔥'),
        ('muscle', '💪'),
        ('clap', '👏'),
        ('wow', '😮'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feed = models.ForeignKey(
        WorkoutFeed,
        on_delete=models.CASCADE,
        related_name='reactions',
    )
    user = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='feed_reactions',
    )
    reaction_type = models.CharField(max_length=10, choices=REACTION_TYPES, default='like')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('feed', 'user')

    def __str__(self):
        return f"{self.user.username} reacted {self.reaction_type} on {self.feed_id}"


# Keep FeedLike as alias for backward compatibility with signals/migrations
FeedLike = FeedReaction
